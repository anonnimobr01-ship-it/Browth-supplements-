<?php
declare(strict_types=1);
namespace Browth;

final class Admin {
    private const PAGE_SIZE = 50;
    private const COMPLETED = ['paid', 'shipped'];

    public static function handle(string $path, string $method, Supabase $db): array {
        $user = Auth::user();
        $uid = $user['uid'];
        RateLimit::check('admin:'.$uid, 90);
        $db->request('POST', 'profiles', ['on_conflict'=>'uid'], $user, 'resolution=merge-duplicates,return=minimal');
        $allowed = $db->request('GET', 'admin_users', [
            'uid'=>'eq.'.$uid, 'select'=>'uid', 'limit'=>1
        ]);
        if (!$allowed) throw new HttpError(403, 'Esta conta não possui acesso administrativo.');

        if ($path === '/api/admin/overview' && $method === 'GET') {
            return ['status'=>200, 'data'=>self::overview($db, self::period($_GET['period'] ?? '30d'))];
        }
        if ($path === '/api/admin/orders' && $method === 'GET') {
            return ['status'=>200, 'data'=>self::orders($db)];
        }
        if ($path === '/api/admin/users' && $method === 'GET') {
            return ['status'=>200, 'data'=>self::users($db)];
        }
        if (preg_match('~^/api/admin/users/([A-Za-z0-9:_-]{1,128})/orders$~D', $path, $m) && $method === 'GET') {
            return ['status'=>200, 'data'=>self::userOrders($db, $m[1])];
        }
        if ($path === '/api/admin/admins' && $method === 'GET') {
            return ['status'=>200, 'data'=>self::admins($db)];
        }
        if ($path === '/api/admin/admins' && $method === 'POST') {
            return ['status'=>200, 'data'=>self::changeAdmin($db, $uid, self::requestBody())];
        }
        throw new HttpError(404, 'Rota administrativa não encontrada.');
    }

    private static function requestBody(): array {
        if (!str_starts_with(strtolower($_SERVER['CONTENT_TYPE'] ?? ''), 'application/json')) {
            throw new HttpError(415, 'Envie JSON.');
        }
        $raw = file_get_contents('php://input', false, null, 0, 8193);
        if (strlen($raw) > 8192) throw new HttpError(413, 'Requisição muito grande.');
        try { $data = json_decode($raw, true, 16, JSON_THROW_ON_ERROR); }
        catch (\JsonException $e) { throw new HttpError(400, 'JSON inválido.'); }
        if (!is_array($data) || array_is_list($data)) throw new HttpError(400, 'Envie um objeto JSON.');
        return $data;
    }

    private static function period(mixed $value): string {
        if (!is_string($value) || !in_array($value, ['7d','30d','90d','365d','all'], true)) {
            throw new HttpError(422, 'Período inválido.');
        }
        return $value;
    }

    private static function all(Supabase $db, string $table, array $query, int $maxRows=50000): array {
        $rows = [];
        for ($offset=0; $offset<$maxRows; $offset+=500) {
            $page = $db->request('GET', $table, $query + ['limit'=>500, 'offset'=>$offset]);
            if (!is_array($page)) throw new HttpError(503, 'Resposta inesperada do banco.');
            array_push($rows, ...$page);
            if (count($page)<500) return $rows;
        }
        throw new HttpError(503, 'Há muitos registros para esta consulta. Refine o período.');
    }

    private static function dateRange(string $period): array {
        if ($period === 'all') return [null, null];
        $days = (int)rtrim($period, 'd');
        $from = new \DateTimeImmutable('today', new \DateTimeZone('UTC'));
        $from = $from->modify('-'.($days-1).' days');
        return [$from->format('Y-m-d').'T00:00:00+00:00', gmdate('Y-m-d').'T23:59:59+00:00'];
    }

    private static function overview(Supabase $db, string $period): array {
        [$from, $to] = self::dateRange($period);
        $query = ['select'=>'id,status,total_cents,created_at,order_items(name,quantity,price_cents)', 'order'=>'created_at.asc,id.asc'];
        if ($from) $query['created_at'] = 'gte.'.$from;
        if ($to) $query['and'] = '(created_at.lte.'.$to.')';
        $orders = self::all($db, 'orders', $query);
        $completed = array_values(array_filter($orders, fn($o)=>in_array($o['status'] ?? '', self::COMPLETED, true)));
        $revenue = array_sum(array_map(fn($o)=>(int)($o['total_cents'] ?? 0), $completed));
        $products = [];
        $daily = [];
        foreach ($completed as $order) {
            $day = substr((string)($order['created_at'] ?? ''), 0, 10);
            if ($day !== '') $daily[$day] = ($daily[$day] ?? 0) + (int)($order['total_cents'] ?? 0);
            foreach (($order['order_items'] ?? []) as $item) {
                $name = (string)($item['name'] ?? 'Produto');
                if (!isset($products[$name])) $products[$name] = ['name'=>$name,'quantity'=>0,'revenue_cents'=>0];
                $products[$name]['quantity'] += (int)($item['quantity'] ?? 0);
                $products[$name]['revenue_cents'] += (int)($item['quantity'] ?? 0) * (int)($item['price_cents'] ?? 0);
            }
        }
        usort($products, fn($a,$b)=>$b['quantity'] <=> $a['quantity']);
        ksort($daily);
        return [
            'period'=>$period,
            'sales_count'=>count($completed),
            'orders_count'=>count($orders),
            'pending_count'=>count(array_filter($orders,fn($o)=>($o['status']??'')==='awaiting_payment')),
            'revenue_cents'=>$revenue,
            'average_ticket_cents'=>count($completed) ? (int)round($revenue/count($completed)) : 0,
            'top_products'=>array_slice(array_values($products),0,8),
            'daily'=>array_map(fn($date,$value)=>['date'=>$date,'revenue_cents'=>$value],array_keys($daily),array_values($daily))
        ];
    }

    private static function orders(Supabase $db): array {
        $offset = filter_var($_GET['offset'] ?? 0, FILTER_VALIDATE_INT, ['options'=>['min_range'=>0,'max_range'=>100000]]);
        if ($offset === false) throw new HttpError(422, 'Página inválida.');
        $query = ['select'=>'id,uid,status,subtotal_cents,shipping_cents,total_cents,created_at,address,order_items(name,image,quantity,price_cents)','order'=>'created_at.desc,id.asc','limit'=>self::PAGE_SIZE,'offset'=>$offset];
        $status = $_GET['status'] ?? '';
        if ($status !== '') {
            if (!is_string($status) || !in_array($status,['awaiting_payment','paid','shipped','cancelled'],true)) throw new HttpError(422,'Status inválido.');
            $query['status'] = 'eq.'.$status;
        }
        foreach (['from'=>'gte','to'=>'lte'] as $key=>$operator) {
            if (isset($_GET[$key]) && $_GET[$key] !== '') {
                $date = $_GET[$key];
                if (!is_string($date) || !preg_match('/^\d{4}-\d{2}-\d{2}$/D',$date)) throw new HttpError(422,'Data inválida.');
                $query[$key==='from'?'created_at':'and'] = $key==='from' ? $operator.'.'.$date.'T00:00:00+00:00' : '(created_at.lte.'.$date.'T23:59:59+00:00)';
            }
        }
        $rows = $db->request('GET','orders',$query);
        $uids = array_values(array_unique(array_column($rows,'uid')));
        $profiles = $uids ? $db->request('GET','profiles',['uid'=>'in.('.implode(',',$uids).')','select'=>'uid,name,email','limit'=>100]) : [];
        $byUid = [];
        foreach ($profiles as $profile) $byUid[$profile['uid']] = $profile;
        foreach ($rows as &$row) $row['customer'] = $byUid[$row['uid']] ?? ['name'=>$row['address']['name'] ?? 'Cliente','email'=>''];
        unset($row);
        return ['items'=>$rows,'has_more'=>count($rows)===self::PAGE_SIZE,'offset'=>$offset];
    }

    private static function users(Supabase $db): array {
        $offset = filter_var($_GET['offset'] ?? 0, FILTER_VALIDATE_INT, ['options'=>['min_range'=>0,'max_range'=>100000]]);
        if ($offset === false) throw new HttpError(422, 'Página inválida.');
        $query = ['select'=>'uid,name,email,created_at','order'=>'created_at.desc,uid.asc','limit'=>self::PAGE_SIZE,'offset'=>$offset];
        $search = $_GET['q'] ?? '';
        if ($search !== '') {
            if (!is_string($search)) throw new HttpError(422,'Busca inválida.');
            $search = mb_substr(preg_replace('/[^\p{L}\p{N}@._ -]/u','',$search) ?? '',0,80);
            if ($search !== '') $query['or'] = '(name.ilike.*'.$search.'*,email.ilike.*'.$search.'*)';
        }
        $rows = $db->request('GET','profiles',$query);
        $uids = array_values(array_unique(array_column($rows,'uid')));
        $counts = [];
        if ($uids) {
            $orders = $db->request('GET','orders',['uid'=>'in.('.implode(',',$uids).')','select'=>'uid,id,status,total_cents,created_at','order'=>'created_at.desc','limit'=>500]);
            foreach ($orders as $order) {
                $key=$order['uid'];
                if (!isset($counts[$key])) $counts[$key]=['orders_count'=>0,'spent_cents'=>0];
                $counts[$key]['orders_count']++;
                if (in_array($order['status'] ?? '',self::COMPLETED,true)) $counts[$key]['spent_cents']+=(int)$order['total_cents'];
            }
        }
        foreach ($rows as &$row) $row['purchases'] = $counts[$row['uid']] ?? ['orders_count'=>0,'spent_cents'=>0];
        unset($row);
        return ['items'=>$rows,'has_more'=>count($rows)===self::PAGE_SIZE,'offset'=>$offset];
    }

    private static function userOrders(Supabase $db, string $uid): array {
        $profile = $db->request('GET','profiles',['uid'=>'eq.'.$uid,'select'=>'uid,name,email,created_at','limit'=>1]);
        if (!$profile) throw new HttpError(404,'Usuário não encontrado.');
        $orders = self::all($db,'orders',['uid'=>'eq.'.$uid,'select'=>'id,status,subtotal_cents,shipping_cents,total_cents,created_at,order_items(name,image,quantity,price_cents)','order'=>'created_at.desc,id.asc'],10000);
        return ['user'=>$profile[0],'orders'=>$orders];
    }

    private static function admins(Supabase $db): array {
        $rows = self::all($db,'admin_users',['select'=>'uid,created_at,created_by','order'=>'created_at.asc,uid.asc'],10000);
        $uids = array_values(array_unique(array_merge(array_column($rows,'uid'),array_filter(array_column($rows,'created_by')))));
        $profiles = $uids ? $db->request('GET','profiles',['uid'=>'in.('.implode(',',$uids).')','select'=>'uid,name,email','limit'=>1000]) : [];
        $byUid = [];
        foreach ($profiles as $profile) $byUid[$profile['uid']] = $profile;
        foreach ($rows as &$row) {
            $row['user'] = $byUid[$row['uid']] ?? ['uid'=>$row['uid'],'name'=>'Conta sem perfil','email'=>''];
            $row['granted_by'] = $byUid[$row['created_by'] ?? ''] ?? null;
        }
        unset($row);
        return ['items'=>$rows];
    }

    private static function changeAdmin(Supabase $db, string $actorUid, array $data): array {
        $target = $data['uid'] ?? null;
        $action = $data['action'] ?? null;
        if (!is_string($target) || !preg_match('/^[A-Za-z0-9:_-]{1,128}$/D',$target) || !in_array($action,['grant','revoke'],true)) {
            throw new HttpError(422,'Informe um usuário e uma ação válida.');
        }
        $profile = $db->request('GET','profiles',['uid'=>'eq.'.$target,'select'=>'uid,name,email','limit'=>1]);
        if (!$profile) throw new HttpError(404,'Usuário não encontrado. Ele precisa entrar no site ao menos uma vez.');
        $existing = $db->request('GET','admin_users',['uid'=>'eq.'.$target,'select'=>'uid','limit'=>1]);
        if ($action === 'grant') {
            if (!$existing) $db->request('POST','admin_users',[],['uid'=>$target,'created_by'=>$actorUid],'return=minimal');
            return ['ok'=>true,'action'=>'grant'];
        }
        if (!$existing) return ['ok'=>true,'action'=>'revoke'];
        if ($target === $actorUid) throw new HttpError(409,'Peça a outro administrador para remover seu próprio acesso.');
        $admins = self::all($db,'admin_users',['select'=>'uid'],10000);
        if (count($admins)<=1) throw new HttpError(409,'O último administrador não pode ser removido.');
        $db->request('DELETE','admin_users',['uid'=>'eq.'.$target]);
        return ['ok'=>true,'action'=>'revoke'];
    }
}
