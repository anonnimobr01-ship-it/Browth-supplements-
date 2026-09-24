// Somente Authentication. Importação sob demanda; nenhum Firestore/Realtime Database.
let auth, sdk;
export async function initialize(config,onChange){
 const [app,authentication]=await Promise.all([
  import('https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js'),
  import('https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js')
 ]);
 sdk=authentication;auth=sdk.getAuth(app.initializeApp(config));
 await sdk.setPersistence(auth,sdk.browserLocalPersistence);
 await new Promise(resolve=>{let first=true;sdk.onAuthStateChanged(auth,user=>{onChange(user);if(first){first=false;resolve();}});});
}
export async function token(force=false){if(!auth?.currentUser)throw new Error('Entre na sua conta para continuar.');return auth.currentUser.getIdToken(force);}
export async function login(email,password){return sdk.signInWithEmailAndPassword(auth,email,password);}
export async function register(name,email,password){const result=await sdk.createUserWithEmailAndPassword(auth,email,password);await sdk.updateProfile(result.user,{displayName:name});await result.user.getIdToken(true);return result;}
export async function google(){return sdk.signInWithPopup(auth,new sdk.GoogleAuthProvider());}
export async function logout(){return sdk.signOut(auth);}
export async function reset(email){return sdk.sendPasswordResetEmail(auth,email);}
export function message(error){return ({'auth/invalid-credential':'E-mail ou senha incorretos.','auth/email-already-in-use':'Este e-mail já está cadastrado.','auth/weak-password':'Use uma senha mais forte.','auth/invalid-email':'Confira seu e-mail.','auth/popup-closed-by-user':'O login com Google foi fechado.','auth/popup-blocked':'Permita o pop-up para entrar com Google.','auth/account-exists-with-different-credential':'Entre com o método usado no cadastro deste e-mail.','auth/unauthorized-domain':'Este domínio precisa ser autorizado no Firebase.','auth/too-many-requests':'Muitas tentativas. Aguarde e tente novamente.','auth/network-request-failed':'Falha de conexão com o login.'})[error.code]||error.message||'Não foi possível concluir a ação.';}
