/* ============================================================
   FLEXAGO LANGUAGES - load after i18n.js on every page.

   1. auth/account text for signup, login and the account screens
   2. A phrase table that translates exact English text wherever
      it appears: labels, screens built by code, and alerts
   3. The language switcher, remembered between visits
============================================================ */

const AUTH_TEXT = {
  en: { tagline: "Logistics marketplace for travelers & senders", step1: "Step 1 of 5", step2: "Step 2 of 5", step3: "Step 3 of 5", step4: "Step 4 of 5", step5: "Step 5 of 5", signup_title: "Create your account", signup_lead: "Use your legal name exactly as it appears on your government ID.", first_name: "Legal first name", last_name: "Legal last name", role_question: "How will you use Flexago?", role_sender: "Send packages", role_traveler: "Carry packages", continue: "Continue", have_account: "Already have an account?", no_account: "New to Flexago?", login: "Login", about: "About", email_title: "Verify your email", email_lead: "We'll send a 6-digit code to confirm this email is yours.", email: "Email", send_code: "Send code", code: "Verification code", verify_continue: "Verify and continue", phone_title: "Verify your phone", phone_lead: "We'll text a 6-digit code to confirm this number is yours.", phone: "Phone number", sms_consent: "By tapping Send code, you agree to receive SMS verification messages from Flexago. Message and data rates may apply. See our", privacy: "Privacy Policy", terms: "Terms of Service", identity_title: "Verify your identity", identity_lead: "Have your government ID ready. You'll take a photo of it and a selfie. The name on your ID must match the name you entered.", identity_start: "Start identity check", checking_title: "Checking your identity", checking_lead: "This usually takes under a minute. Please keep this page open.", try_again: "Try again", create_title: "Finish your account", create_lead: "These details are verified and can't be changed.", full_name: "Full name", dob: "Date of birth", password: "Create password", password_plain: "Password", confirm_password: "Confirm password", password_hint: "Use at least 8 characters.", create_button: "Create account", welcome_title: "Send with travelers already going your way", code_sent: "Code sent.", error_generic: "Something went wrong. Please try again.", error_network: "Can't reach Flexago. Check your connection.", error_role: "Please choose how you'll use Flexago.", error_password_match: "Passwords do not match.", identity_mismatch: "The name on your ID doesn't match the name you entered. Contact support.", identity_failed: "We couldn't verify your ID. Please try again." },
  es: { tagline: "Mercado logístico para viajeros y remitentes", step1: "Paso 1 de 5", step2: "Paso 2 de 5", step3: "Paso 3 de 5", step4: "Paso 4 de 5", step5: "Paso 5 de 5", signup_title: "Crea tu cuenta", signup_lead: "Usa tu nombre legal tal como aparece en tu identificación oficial.", first_name: "Nombre legal", last_name: "Apellido legal", role_question: "¿Cómo usarás Flexago?", role_sender: "Enviar paquetes", role_traveler: "Llevar paquetes", continue: "Continuar", have_account: "¿Ya tienes una cuenta?", no_account: "¿Nuevo en Flexago?", login: "Iniciar sesión", about: "Acerca de", email_title: "Verifica tu correo", email_lead: "Te enviaremos un código de 6 dígitos para confirmar que este correo es tuyo.", email: "Correo electrónico", send_code: "Enviar código", code: "Código de verificación", verify_continue: "Verificar y continuar", phone_title: "Verifica tu teléfono", phone_lead: "Te enviaremos un SMS con un código de 6 dígitos para confirmar que este número es tuyo.", phone: "Número de teléfono", sms_consent: "Al tocar Enviar código, aceptas recibir mensajes SMS de verificación de Flexago. Pueden aplicarse tarifas de mensajes y datos. Consulta nuestra", privacy: "Política de privacidad", terms: "Términos de servicio", identity_title: "Verifica tu identidad", identity_lead: "Ten a mano tu identificación oficial. Le tomarás una foto y te harás una selfie. El nombre de tu identificación debe coincidir con el que ingresaste.", identity_start: "Iniciar verificación de identidad", checking_title: "Verificando tu identidad", checking_lead: "Esto suele tardar menos de un minuto. Mantén esta página abierta.", try_again: "Intentar de nuevo", create_title: "Completa tu cuenta", create_lead: "Estos datos están verificados y no se pueden cambiar.", full_name: "Nombre completo", dob: "Fecha de nacimiento", password: "Crear contraseña", password_plain: "Contraseña", confirm_password: "Confirmar contraseña", password_hint: "Usa al menos 8 caracteres.", create_button: "Crear cuenta", welcome_title: "Envía con viajeros que ya van en tu dirección", code_sent: "Código enviado.", error_generic: "Algo salió mal. Inténtalo de nuevo.", error_network: "No se puede conectar con Flexago. Revisa tu conexión.", error_role: "Elige cómo usarás Flexago.", error_password_match: "Las contraseñas no coinciden.", identity_mismatch: "El nombre de tu identificación no coincide con el que ingresaste. Contacta a soporte.", identity_failed: "No pudimos verificar tu identificación. Inténtalo de nuevo." },
  fr: { tagline: "Plateforme logistique pour voyageurs et expéditeurs", step1: "Étape 1 sur 5", step2: "Étape 2 sur 5", step3: "Étape 3 sur 5", step4: "Étape 4 sur 5", step5: "Étape 5 sur 5", signup_title: "Créez votre compte", signup_lead: "Utilisez votre nom légal tel qu'il figure sur votre pièce d'identité.", first_name: "Prénom légal", last_name: "Nom légal", role_question: "Comment utiliserez-vous Flexago ?", role_sender: "Envoyer des colis", role_traveler: "Transporter des colis", continue: "Continuer", have_account: "Vous avez déjà un compte ?", no_account: "Nouveau sur Flexago ?", login: "Connexion", about: "À propos", email_title: "Vérifiez votre e-mail", email_lead: "Nous enverrons un code à 6 chiffres pour confirmer que cet e-mail vous appartient.", email: "E-mail", send_code: "Envoyer le code", code: "Code de vérification", verify_continue: "Vérifier et continuer", phone_title: "Vérifiez votre téléphone", phone_lead: "Nous enverrons un SMS avec un code à 6 chiffres pour confirmer que ce numéro vous appartient.", phone: "Numéro de téléphone", sms_consent: "En appuyant sur Envoyer le code, vous acceptez de recevoir des SMS de vérification de Flexago. Des frais de messagerie et de données peuvent s'appliquer. Consultez notre", privacy: "Politique de confidentialité", terms: "Conditions d'utilisation", identity_title: "Vérifiez votre identité", identity_lead: "Préparez votre pièce d'identité. Vous en prendrez une photo ainsi qu'un selfie. Le nom sur votre pièce doit correspondre au nom saisi.", identity_start: "Commencer la vérification d'identité", checking_title: "Vérification de votre identité", checking_lead: "Cela prend généralement moins d'une minute. Gardez cette page ouverte.", try_again: "Réessayer", create_title: "Finalisez votre compte", create_lead: "Ces informations sont vérifiées et ne peuvent pas être modifiées.", full_name: "Nom complet", dob: "Date de naissance", password: "Créer un mot de passe", password_plain: "Mot de passe", confirm_password: "Confirmer le mot de passe", password_hint: "Utilisez au moins 8 caractères.", create_button: "Créer un compte", welcome_title: "Envoyez avec des voyageurs qui vont déjà dans votre direction", code_sent: "Code envoyé.", error_generic: "Une erreur s'est produite. Veuillez réessayer.", error_network: "Impossible de joindre Flexago. Vérifiez votre connexion.", error_role: "Choisissez comment vous utiliserez Flexago.", error_password_match: "Les mots de passe ne correspondent pas.", identity_mismatch: "Le nom sur votre pièce ne correspond pas au nom saisi. Contactez l'assistance.", identity_failed: "Nous n'avons pas pu vérifier votre pièce. Veuillez réessayer." },
  ht: { tagline: "Mache lojistik pou vwayajè ak moun k ap voye koli", step1: "Etap 1 sou 5", step2: "Etap 2 sou 5", step3: "Etap 3 sou 5", step4: "Etap 4 sou 5", step5: "Etap 5 sou 5", signup_title: "Kreye kont ou", signup_lead: "Sèvi ak non legal ou jan li ekri sou pyès idantite ou.", first_name: "Prenon legal", last_name: "Non legal", role_question: "Kijan ou pral itilize Flexago?", role_sender: "Voye koli", role_traveler: "Pote koli", continue: "Kontinye", have_account: "Ou gen yon kont deja?", no_account: "Ou nouvo sou Flexago?", login: "Konekte", about: "Konsènan", email_title: "Verifye imèl ou", email_lead: "N ap voye yon kòd 6 chif pou konfime imèl sa a se pa ou.", email: "Imèl", send_code: "Voye kòd la", code: "Kòd verifikasyon", verify_continue: "Verifye epi kontinye", phone_title: "Verifye telefòn ou", phone_lead: "N ap voye yon tèks ak yon kòd 6 chif pou konfime nimewo sa a se pa ou.", phone: "Nimewo telefòn", sms_consent: "Lè ou peze Voye kòd la, ou dakò pou resevwa mesaj SMS verifikasyon nan men Flexago. Frè mesaj ak done ka aplike. Gade", privacy: "Règleman sou vi prive", terms: "Kondisyon sèvis", identity_title: "Verifye idantite ou", identity_lead: "Prepare pyès idantite ou. W ap pran yon foto li ak yon selfi. Non ki sou pyès la dwe menm ak non ou te antre a.", identity_start: "Kòmanse verifikasyon idantite", checking_title: "N ap verifye idantite ou", checking_lead: "Sa pran mwens pase yon minit anjeneral. Kite paj sa a louvri.", try_again: "Eseye ankò", create_title: "Fini kont ou", create_lead: "Enfòmasyon sa yo verifye epi yo pa ka chanje.", full_name: "Non konplè", dob: "Dat nesans", password: "Kreye modpas", password_plain: "Modpas", confirm_password: "Konfime modpas", password_hint: "Sèvi ak omwen 8 karaktè.", create_button: "Kreye kont", welcome_title: "Voye ak vwayajè ki deja prale kote ou vle a", code_sent: "Kòd la voye.", error_generic: "Gen yon bagay ki pa mache. Tanpri eseye ankò.", error_network: "Nou pa ka jwenn Flexago. Tcheke koneksyon ou.", error_role: "Tanpri chwazi kijan ou pral itilize Flexago.", error_password_match: "Modpas yo pa menm.", identity_mismatch: "Non ki sou pyès ou a pa menm ak non ou te antre a. Kontakte sipò.", identity_failed: "Nou pa t ka verifye pyès ou a. Tanpri eseye ankò." },
  zh: { tagline: "面向旅行者和寄件人的物流平台", step1: "第 1 步，共 5 步", step2: "第 2 步，共 5 步", step3: "第 3 步，共 5 步", step4: "第 4 步，共 5 步", step5: "第 5 步，共 5 步", signup_title: "创建您的账户", signup_lead: "请使用与政府证件完全一致的法定姓名。", first_name: "法定名字", last_name: "法定姓氏", role_question: "您将如何使用 Flexago？", role_sender: "寄送包裹", role_traveler: "携带包裹", continue: "继续", have_account: "已有账户？", no_account: "初次使用 Flexago？", login: "登录", about: "关于", email_title: "验证您的邮箱", email_lead: "我们将发送 6 位验证码，以确认此邮箱属于您。", email: "邮箱", send_code: "发送验证码", code: "验证码", verify_continue: "验证并继续", phone_title: "验证您的手机", phone_lead: "我们将发送 6 位短信验证码，以确认此号码属于您。", phone: "手机号码", sms_consent: "点击“发送验证码”即表示您同意接收 Flexago 的短信验证信息。可能产生短信和流量费用。请查看我们的", privacy: "隐私政策", terms: "服务条款", identity_title: "验证您的身份", identity_lead: "请准备好政府证件。您需要拍摄证件照片和一张自拍。证件上的姓名必须与您填写的姓名一致。", identity_start: "开始身份验证", checking_title: "正在验证您的身份", checking_lead: "通常不到一分钟。请保持此页面打开。", try_again: "重试", create_title: "完成您的账户", create_lead: "这些信息已验证，无法更改。", full_name: "全名", dob: "出生日期", password: "创建密码", password_plain: "密码", confirm_password: "确认密码", password_hint: "至少使用 8 个字符。", create_button: "创建账户", welcome_title: "请顺路的旅行者为您寄送", code_sent: "验证码已发送。", error_generic: "出现问题，请重试。", error_network: "无法连接 Flexago，请检查网络。", error_role: "请选择您使用 Flexago 的方式。", error_password_match: "两次输入的密码不一致。", identity_mismatch: "证件上的姓名与您填写的姓名不一致。请联系客服。", identity_failed: "我们无法验证您的证件，请重试。" },
  pt: { tagline: "Marketplace logístico para viajantes e remetentes", step1: "Passo 1 de 5", step2: "Passo 2 de 5", step3: "Passo 3 de 5", step4: "Passo 4 de 5", step5: "Passo 5 de 5", signup_title: "Crie sua conta", signup_lead: "Use seu nome legal exatamente como aparece no seu documento oficial.", first_name: "Nome legal", last_name: "Sobrenome legal", role_question: "Como você usará a Flexago?", role_sender: "Enviar pacotes", role_traveler: "Levar pacotes", continue: "Continuar", have_account: "Já tem uma conta?", no_account: "Novo na Flexago?", login: "Entrar", about: "Sobre", email_title: "Verifique seu e-mail", email_lead: "Enviaremos um código de 6 dígitos para confirmar que este e-mail é seu.", email: "E-mail", send_code: "Enviar código", code: "Código de verificação", verify_continue: "Verificar e continuar", phone_title: "Verifique seu telefone", phone_lead: "Enviaremos um SMS com um código de 6 dígitos para confirmar que este número é seu.", phone: "Número de telefone", sms_consent: "Ao tocar em Enviar código, você concorda em receber mensagens SMS de verificação da Flexago. Podem ser aplicadas tarifas de mensagens e dados. Consulte nossa", privacy: "Política de Privacidade", terms: "Termos de Serviço", identity_title: "Verifique sua identidade", identity_lead: "Tenha seu documento oficial em mãos. Você tirará uma foto dele e uma selfie. O nome no documento deve ser igual ao nome informado.", identity_start: "Iniciar verificação de identidade", checking_title: "Verificando sua identidade", checking_lead: "Isso geralmente leva menos de um minuto. Mantenha esta página aberta.", try_again: "Tentar novamente", create_title: "Conclua sua conta", create_lead: "Estes dados estão verificados e não podem ser alterados.", full_name: "Nome completo", dob: "Data de nascimento", password: "Criar senha", password_plain: "Senha", confirm_password: "Confirmar senha", password_hint: "Use pelo menos 8 caracteres.", create_button: "Criar conta", welcome_title: "Envie com viajantes que já vão na sua direção", code_sent: "Código enviado.", error_generic: "Algo deu errado. Tente novamente.", error_network: "Não foi possível acessar a Flexago. Verifique sua conexão.", error_role: "Escolha como você usará a Flexago.", error_password_match: "As senhas não coincidem.", identity_mismatch: "O nome no documento não corresponde ao nome informado. Fale com o suporte.", identity_failed: "Não foi possível verificar seu documento. Tente novamente." }
};

const ACCOUNT_TEXT = {
  en: { verified: "Verified", not_verified: "Not Verified", identity: "Identity check", background: "Background check", delete_title: "Delete account", delete_body: "This permanently removes your personal details. Delivery and payment records are kept without your details, as required for tax and disputes.", delete_password: "Enter your password to confirm", delete_button: "Delete my account" },
  es: { verified: "Verificado", not_verified: "No verificado", identity: "Verificación de identidad", background: "Verificación de antecedentes", delete_title: "Eliminar cuenta", delete_body: "Esto elimina permanentemente tus datos personales. Los registros de entregas y pagos se conservan sin tus datos, como se requiere para impuestos y disputas.", delete_password: "Ingresa tu contraseña para confirmar", delete_button: "Eliminar mi cuenta" },
  fr: { verified: "Vérifié", not_verified: "Non vérifié", identity: "Vérification d'identité", background: "Vérification des antécédents", delete_title: "Supprimer le compte", delete_body: "Cette action supprime définitivement vos données personnelles. Les dossiers de livraison et de paiement sont conservés sans vos données, pour les impôts et les litiges.", delete_password: "Saisissez votre mot de passe pour confirmer", delete_button: "Supprimer mon compte" },
  ht: { verified: "Verifye", not_verified: "Pa verifye", identity: "Verifikasyon idantite", background: "Verifikasyon dosye", delete_title: "Efase kont", delete_body: "Sa efase enfòmasyon pèsonèl ou nèt. Dosye livrezon ak peman yo rete san enfòmasyon ou yo, pou taks ak diskisyon.", delete_password: "Antre modpas ou pou konfime", delete_button: "Efase kont mwen" },
  zh: { verified: "已验证", not_verified: "未验证", identity: "身份验证", background: "背景调查", delete_title: "删除账户", delete_body: "这将永久删除您的个人信息。为满足税务和纠纷处理要求，配送和付款记录将保留，但不含您的个人信息。", delete_password: "输入密码以确认", delete_button: "删除我的账户" },
  pt: { verified: "Verificado", not_verified: "Não verificado", identity: "Verificação de identidade", background: "Verificação de antecedentes", delete_title: "Excluir conta", delete_body: "Isso remove permanentemente seus dados pessoais. Os registros de entregas e pagamentos são mantidos sem seus dados, conforme exigido para impostos e disputas.", delete_password: "Digite sua senha para confirmar", delete_button: "Excluir minha conta" }
};

const EXTRA_TEXT = {
  en: ["Search country", "On your route", "{miles} mi off route"],
  es: ["Buscar país", "En tu ruta", "A {miles} mi de tu ruta"],
  fr: ["Rechercher un pays", "Sur votre trajet", "À {miles} mi de votre trajet"],
  ht: ["Chèche peyi", "Sou wout ou", "{miles} mil lwen wout ou"],
  zh: ["搜索国家", "在您的路线上", "偏离路线 {miles} 英里"],
  pt: ["Buscar país", "Na sua rota", "A {miles} mi da sua rota"]
};

Object.keys(EXTRA_TEXT).forEach((lang) => {
  const [searchCountry, onRoute, offRoute] = EXTRA_TEXT[lang];

  AUTH_TEXT[lang].search_country = searchCountry;
  ACCOUNT_TEXT[lang].on_route = onRoute;
  ACCOUNT_TEXT[lang].off_route = offRoute;
});

Object.keys(translations).forEach((lang) => {
  translations[lang].auth = AUTH_TEXT[lang];
  translations[lang].account = ACCOUNT_TEXT[lang];
});

/* English text -> [es, fr, ht, zh, pt] */
const PHRASES = {
  "Account & Identity": ["Cuenta e identidad", "Compte et identité", "Kont ak idantite", "账户与身份", "Conta e identidade"],
  "Jobs / Requests": ["Trabajos / Solicitudes", "Missions / Demandes", "Travay / Demann", "任务 / 请求", "Trabalhos / Pedidos"],
  "Create Delivery": ["Crear entrega", "Créer une livraison", "Kreye livrezon", "创建配送", "Criar entrega"],
  "My Deliveries": ["Mis entregas", "Mes livraisons", "Livrezon mwen yo", "我的配送", "Minhas entregas"],
  "Delivery Status": ["Estado de la entrega", "Statut de la livraison", "Estati livrezon", "配送状态", "Status da entrega"],
  "Payouts": ["Pagos", "Paiements", "Peman", "收款", "Pagamentos"],
  "Verification": ["Verificación", "Vérification", "Verifikasyon", "验证", "Verificação"],
  "Support": ["Soporte", "Assistance", "Sipò", "客服", "Suporte"],
  "Logout": ["Cerrar sesión", "Déconnexion", "Dekonekte", "退出登录", "Sair"],
  "Verified Information": ["Información verificada", "Informations vérifiées", "Enfòmasyon verifye", "已验证信息", "Informações verificadas"],
  "Personal Information": ["Información personal", "Informations personnelles", "Enfòmasyon pèsonèl", "个人信息", "Informações pessoais"],
  "First Name": ["Nombre", "Prénom", "Prenon", "名字", "Nome"],
  "Last Name": ["Apellido", "Nom", "Non", "姓氏", "Sobrenome"],
  "Date of Birth": ["Fecha de nacimiento", "Date de naissance", "Dat nesans", "出生日期", "Data de nascimento"],
  "Phone Number": ["Número de teléfono", "Numéro de téléphone", "Nimewo telefòn", "手机号码", "Número de telefone"],
  "Phone number": ["Número de teléfono", "Numéro de téléphone", "Nimewo telefòn", "手机号码", "Número de telefone"],
  "Phone": ["Teléfono", "Téléphone", "Telefòn", "电话", "Telefone"],
  "Email": ["Correo electrónico", "E-mail", "Imèl", "邮箱", "E-mail"],
  "Email Address": ["Correo electrónico", "Adresse e-mail", "Adrès imèl", "邮箱地址", "Endereço de e-mail"],
  "Email address": ["Correo electrónico", "Adresse e-mail", "Adrès imèl", "邮箱地址", "Endereço de e-mail"],
  "Address": ["Dirección", "Adresse", "Adrès", "地址", "Endereço"],
  "City": ["Ciudad", "Ville", "Vil", "城市", "Cidade"],
  "State": ["Estado", "État", "Eta", "州/省", "Estado"],
  "Zip Code": ["Código postal", "Code postal", "Kòd postal", "邮政编码", "CEP"],
  "Country": ["País", "Pays", "Peyi", "国家", "País"],
  "Save Changes": ["Guardar cambios", "Enregistrer", "Anrejistre chanjman yo", "保存更改", "Salvar alterações"],
  "Save": ["Guardar", "Enregistrer", "Anrejistre", "保存", "Salvar"],
  "Saving...": ["Guardando...", "Enregistrement...", "N ap anrejistre...", "正在保存...", "Salvando..."],
  "Change Photo": ["Cambiar foto", "Changer la photo", "Chanje foto", "更换照片", "Alterar foto"],
  "Identity Check": ["Verificación de identidad", "Vérification d'identité", "Verifikasyon idantite", "身份验证", "Verificação de identidade"],
  "Identity Verification": ["Verificación de identidad", "Vérification d'identité", "Verifikasyon idantite", "身份验证", "Verificação de identidade"],
  "Your verification status.": ["Tu estado de verificación.", "Votre statut de vérification.", "Estati verifikasyon ou.", "您的验证状态。", "Seu status de verificação."],
  "✓ Verified": ["✓ Verificado", "✓ Vérifié", "✓ Verifye", "✓ 已验证", "✓ Verificado"],
  "Identity check": ["Verificación de identidad", "Vérification d'identité", "Verifikasyon idantite", "身份验证", "Verificação de identidade"],
  "Background check": ["Verificación de antecedentes", "Vérification des antécédents", "Verifikasyon dosye", "背景调查", "Verificação de antecedentes"],
  "Not Verified": ["No verificado", "Non vérifié", "Pa verifye", "未验证", "Não verificado"],
  "Pending": ["Pendiente", "En attente", "An atant", "待处理", "Pendente"],
  "deliveries • Joined": ["entregas • Se unió en", "livraisons • Inscrit en", "livrezon • Enskri an", "次配送 • 加入于", "entregas • Entrou em"],
  "trips • Joined": ["viajes • Se unió en", "trajets • Inscrit en", "vwayaj • Enskri an", "次行程 • 加入于", "viagens • Entrou em"],
  "Traveler": ["Viajero", "Voyageur", "Vwayajè", "旅行者", "Viajante"],
  "Sender": ["Remitente", "Expéditeur", "Moun k ap voye", "寄件人", "Remetente"],
  "Receiver": ["Destinatario", "Destinataire", "Moun k ap resevwa", "收件人", "Destinatário"],
  "Delivery": ["Entrega", "Livraison", "Livrezon", "配送", "Entrega"],
  "Package": ["Paquete", "Colis", "Koli", "包裹", "Pacote"],
  "Accept": ["Aceptar", "Accepter", "Aksepte", "接受", "Aceitar"],
  "Decline": ["Rechazar", "Refuser", "Refize", "拒绝", "Recusar"],
  "Clear": ["Borrar", "Effacer", "Efase", "清除", "Limpar"],
  "Send": ["Enviar", "Envoyer", "Voye", "发送", "Enviar"],
  "Upload": ["Subir", "Téléverser", "Telechaje", "上传", "Enviar"],
  "Review": ["Reseña", "Avis", "Revizyon", "评价", "Avaliação"],
  "Rating": ["Calificación", "Note", "Nòt", "评分", "Avaliação"],
  "Size": ["Tamaño", "Taille", "Gwosè", "尺寸", "Tamanho"],
  "Small": ["Pequeño", "Petit", "Piti", "小", "Pequeno"],
  "Medium": ["Mediano", "Moyen", "Mwayen", "中", "Médio"],
  "Large": ["Grande", "Grand", "Gwo", "大", "Grande"],
  "Insurance": ["Seguro", "Assurance", "Asirans", "保险", "Seguro"],
  "Description": ["Descripción", "Description", "Deskripsyon", "描述", "Descrição"],
  "Subject": ["Asunto", "Objet", "Sijè", "主题", "Assunto"],
  "Signature": ["Firma", "Signature", "Siyati", "签名", "Assinatura"],
  "Status": ["Estado", "Statut", "Estati", "状态", "Status"],
  "Name": ["Nombre", "Nom", "Non", "姓名", "Nome"],
  "Weight": ["Peso", "Poids", "Pwa", "重量", "Peso"],
  "Weight (lbs)": ["Peso (lb)", "Poids (lb)", "Pwa (liv)", "重量（磅）", "Peso (lb)"],
  "Pickup": ["Recogida", "Retrait", "Ranmase", "取件", "Coleta"],
  "Dropoff": ["Entrega", "Dépôt", "Depoze", "送达", "Entrega"],
  "Payout": ["Pago", "Paiement", "Peman", "收款", "Pagamento"],
  "Amount": ["Monto", "Montant", "Montan", "金额", "Valor"],
  "Miles": ["Millas", "Miles", "Mil", "英里", "Milhas"],
  "Delivered": ["Entregado", "Livré", "Livre", "已送达", "Entregue"],
  "Delivery Details": ["Detalles de la entrega", "Détails de la livraison", "Detay livrezon", "配送详情", "Detalhes da entrega"],
  "Sender Details": ["Datos del remitente", "Détails de l'expéditeur", "Detay moun k ap voye", "寄件人详情", "Dados do remetente"],
  "Sender details": ["Datos del remitente", "Détails de l'expéditeur", "Detay moun k ap voye", "寄件人详情", "Dados do remetente"],
  "Receiver Details": ["Datos del destinatario", "Détails du destinataire", "Detay moun k ap resevwa", "收件人详情", "Dados do destinatário"],
  "Receiver details": ["Datos del destinatario", "Détails du destinataire", "Detay moun k ap resevwa", "收件人详情", "Dados do destinatário"],
  "Item Details": ["Detalles del artículo", "Détails de l'article", "Detay atik", "物品详情", "Detalhes do item"],
  "Item description": ["Descripción del artículo", "Description de l'article", "Deskripsyon atik", "物品描述", "Descrição do item"],
  "Describe the item": ["Describe el artículo", "Décrivez l'article", "Dekri atik la", "描述物品", "Descreva o item"],
  "Package type": ["Tipo de paquete", "Type de colis", "Kalite koli", "包裹类型", "Tipo de pacote"],
  "Delivery type": ["Tipo de entrega", "Type de livraison", "Kalite livrezon", "配送类型", "Tipo de entrega"],
  "Delivery address": ["Dirección de entrega", "Adresse de livraison", "Adrès livrezon", "送货地址", "Endereço de entrega"],
  "Declared value": ["Valor declarado", "Valeur déclarée", "Valè deklare", "申报价值", "Valor declarado"],
  "Estimated cost": ["Costo estimado", "Coût estimé", "Pri estime", "预计费用", "Custo estimado"],
  "Enter pickup address": ["Ingresa la dirección de recogida", "Saisissez l'adresse de retrait", "Antre adrès pou ranmase", "输入取件地址", "Digite o endereço de coleta"],
  "Enter dropoff address": ["Ingresa la dirección de entrega", "Saisissez l'adresse de dépôt", "Antre adrès pou depoze", "输入送达地址", "Digite o endereço de entrega"],
  "Enter weight in pounds": ["Ingresa el peso en libras", "Saisissez le poids en livres", "Antre pwa a an liv", "输入重量（磅）", "Digite o peso em libras"],
  "Add up to 5 photos": ["Agrega hasta 5 fotos", "Ajoutez jusqu'à 5 photos", "Ajoute jiska 5 foto", "最多添加 5 张照片", "Adicione até 5 fotos"],
  "Delivery Photos (up to 5)": ["Fotos de entrega (hasta 5)", "Photos de livraison (jusqu'à 5)", "Foto livrezon (jiska 5)", "配送照片（最多 5 张）", "Fotos da entrega (até 5)"],
  "Photo (optional)": ["Foto (opcional)", "Photo (facultatif)", "Foto (opsyonèl)", "照片（可选）", "Foto (opcional)"],
  "Take or upload a photo": ["Toma o sube una foto", "Prenez ou téléversez une photo", "Pran oswa telechaje yon foto", "拍摄或上传照片", "Tire ou envie uma foto"],
  "Notes for traveler": ["Notas para el viajero", "Notes pour le voyageur", "Nòt pou vwayajè a", "给旅行者的备注", "Notas para o viajante"],
  "Anything special the traveler should know?": ["¿Algo especial que el viajero deba saber?", "Quelque chose que le voyageur doit savoir ?", "Gen yon bagay espesyal vwayajè a dwe konnen?", "有什么需要旅行者特别注意的吗？", "Algo especial que o viajante deva saber?"],
  "Special instructions (optional)": ["Instrucciones especiales (opcional)", "Instructions spéciales (facultatif)", "Enstriksyon espesyal (opsyonèl)", "特殊说明（可选）", "Instruções especiais (opcional)"],
  "Based on distance, urgency, and size": ["Según distancia, urgencia y tamaño", "Selon la distance, l'urgence et la taille", "Selon distans, ijans ak gwosè", "根据距离、紧急程度和尺寸计算", "Com base em distância, urgência e tamanho"],
  "Complete Payment": ["Completar pago", "Finaliser le paiement", "Fini peman", "完成付款", "Concluir pagamento"],
  "Confirm payment to publish your delivery.": ["Confirma el pago para publicar tu entrega.", "Confirmez le paiement pour publier votre livraison.", "Konfime peman an pou pibliye livrezon ou.", "确认付款以发布您的配送。", "Confirme o pagamento para publicar sua entrega."],
  "Pay & Publish Delivery": ["Pagar y publicar entrega", "Payer et publier", "Peye epi pibliye", "付款并发布", "Pagar e publicar"],
  "Generate traveler matches": ["Buscar viajeros", "Trouver des voyageurs", "Jwenn vwayajè", "匹配旅行者", "Encontrar viajantes"],
  "Matching travelers…": ["Buscando viajeros…", "Recherche de voyageurs…", "N ap chèche vwayajè…", "正在匹配旅行者…", "Buscando viajantes…"],
  "Waiting for traveler…": ["Esperando al viajero…", "En attente du voyageur…", "N ap tann vwayajè a…", "正在等待旅行者…", "Aguardando viajante…"],
  "This usually takes less than a minute.": ["Esto suele tardar menos de un minuto.", "Cela prend généralement moins d'une minute.", "Sa pran mwens pase yon minit anjeneral.", "通常不到一分钟。", "Isso geralmente leva menos de um minuto."],
  "Please wait while we match your delivery with available travelers.": ["Espera mientras buscamos viajeros disponibles.", "Veuillez patienter pendant la recherche de voyageurs.", "Tanpri tann pandan n ap chèche vwayajè disponib.", "正在为您的配送匹配可用旅行者，请稍候。", "Aguarde enquanto buscamos viajantes disponíveis."],
  "We’re finding the best traveler for your delivery.": ["Estamos buscando el mejor viajero para tu entrega.", "Nous cherchons le meilleur voyageur pour votre livraison.", "N ap chèche pi bon vwayajè pou livrezon ou.", "我们正在为您寻找最合适的旅行者。", "Estamos buscando o melhor viajante para sua entrega."],
  "View all deliveries you have created.": ["Ve todas las entregas que creaste.", "Voir toutes vos livraisons.", "Wè tout livrezon ou kreye yo.", "查看您创建的所有配送。", "Veja todas as entregas que você criou."],
  "Track Delivery": ["Rastrear entrega", "Suivre la livraison", "Swiv livrezon", "跟踪配送", "Rastrear entrega"],
  "Delivery tracking": ["Seguimiento de entrega", "Suivi de livraison", "Swivi livrezon", "配送跟踪", "Rastreamento da entrega"],
  "Track the progress of your delivery.": ["Sigue el progreso de tu entrega.", "Suivez la progression de votre livraison.", "Swiv pwogrè livrezon ou.", "跟踪配送进度。", "Acompanhe o progresso da sua entrega."],
  "Search Delivery": ["Buscar entrega", "Rechercher", "Chèche livrezon", "搜索配送", "Buscar entrega"],
  "Enter a delivery ID to view its status and route.": ["Ingresa un ID de entrega para ver su estado y ruta.", "Saisissez un identifiant pour voir le statut et l'itinéraire.", "Antre ID livrezon an pou wè estati ak wout li.", "输入配送编号以查看状态和路线。", "Digite o ID da entrega para ver status e rota."],
  "Map will render here.": ["El mapa aparecerá aquí.", "La carte s'affichera ici.", "Kat la ap parèt isit la.", "地图将显示在此处。", "O mapa aparecerá aqui."],
  "Real‑time updates from your traveler.": ["Actualizaciones en tiempo real de tu viajero.", "Mises à jour en direct de votre voyageur.", "Nouvèl an dirèk nan men vwayajè ou.", "来自旅行者的实时更新。", "Atualizações em tempo real do seu viajante."],
  "Traveler accepted your delivery": ["El viajero aceptó tu entrega", "Le voyageur a accepté votre livraison", "Vwayajè a aksepte livrezon ou", "旅行者已接受您的配送", "O viajante aceitou sua entrega"],
  "On the way to pickup": ["En camino a la recogida", "En route vers le retrait", "Sou wout pou ranmase", "正在前往取件", "A caminho da coleta"],
  "On the way to dropoff": ["En camino a la entrega", "En route vers le dépôt", "Sou wout pou depoze", "正在前往送达", "A caminho da entrega"],
  "On My Way to Dropoff": ["En camino a la entrega", "En route vers le dépôt", "Sou wout pou depoze", "正在前往送达", "A caminho da entrega"],
  "Package picked up": ["Paquete recogido", "Colis récupéré", "Koli a ranmase", "包裹已取件", "Pacote coletado"],
  "Pick Up Package": ["Recoger paquete", "Récupérer le colis", "Ranmase koli", "取件", "Coletar pacote"],
  "Complete Delivery": ["Completar entrega", "Terminer la livraison", "Fini livrezon", "完成配送", "Concluir entrega"],
  "Completed delivery": ["Entrega completada", "Livraison terminée", "Livrezon fini", "已完成配送", "Entrega concluída"],
  "Verify Pickup Code": ["Verificar código de recogida", "Vérifier le code de retrait", "Verifye kòd ranmasaj", "验证取件码", "Verificar código de coleta"],
  "Pickup Code": ["Código de recogida", "Code de retrait", "Kòd ranmasaj", "取件码", "Código de coleta"],
  "Proof of Delivery": ["Comprobante de entrega", "Preuve de livraison", "Prèv livrezon", "配送凭证", "Comprovante de entrega"],
  "Upload Delivery Photo": ["Subir foto de entrega", "Téléverser la photo", "Telechaje foto livrezon", "上传配送照片", "Enviar foto da entrega"],
  "Delivery photo": ["Foto de entrega", "Photo de livraison", "Foto livrezon", "配送照片", "Foto da entrega"],
  "Recipient name": ["Nombre del destinatario", "Nom du destinataire", "Non moun k ap resevwa", "收件人姓名", "Nome do destinatário"],
  "Recipient Signature": ["Firma del destinatario", "Signature du destinataire", "Siyati moun k ap resevwa", "收件人签名", "Assinatura do destinatário"],
  "Recipient signature": ["Firma del destinatario", "Signature du destinataire", "Siyati moun k ap resevwa", "收件人签名", "Assinatura do destinatário"],
  "Save Signature": ["Guardar firma", "Enregistrer la signature", "Anrejistre siyati", "保存签名", "Salvar assinatura"],
  "Signed By": ["Firmado por", "Signé par", "Siyen pa", "签收人", "Assinado por"],
  "Signed by": ["Firmado por", "Signé par", "Siyen pa", "签收人", "Assinado por"],
  "Contact Sender": ["Contactar al remitente", "Contacter l'expéditeur", "Kontakte moun k ap voye a", "联系寄件人", "Contatar remetente"],
  "Contact Receiver": ["Contactar al destinatario", "Contacter le destinataire", "Kontakte moun k ap resevwa a", "联系收件人", "Contatar destinatário"],
  "Contact traveler": ["Contactar al viajero", "Contacter le voyageur", "Kontakte vwayajè a", "联系旅行者", "Contatar viajante"],
  "Chat with Sender": ["Chatear con el remitente", "Discuter avec l'expéditeur", "Pale ak moun k ap voye a", "与寄件人聊天", "Conversar com remetente"],
  "Chat with Traveler": ["Chatear con el viajero", "Discuter avec le voyageur", "Pale ak vwayajè a", "与旅行者聊天", "Conversar com viajante"],
  "Delivery conversation": ["Conversación de entrega", "Conversation de livraison", "Konvèsasyon livrezon", "配送会话", "Conversa da entrega"],
  "Type a message...": ["Escribe un mensaje...", "Écrivez un message...", "Ekri yon mesaj...", "输入消息...", "Digite uma mensagem..."],
  "Message your Traveler...": ["Escribe a tu viajero...", "Écrivez à votre voyageur...", "Ekri vwayajè ou...", "给旅行者发消息...", "Fale com seu viajante..."],
  "Messages between you and the Sender will appear here.": ["Tus mensajes con el remitente aparecerán aquí.", "Vos messages avec l'expéditeur apparaîtront ici.", "Mesaj ou ak moun k ap voye a ap parèt isit la.", "您与寄件人的消息将显示在此处。", "Suas mensagens com o remetente aparecerão aqui."],
  "Open a delivery conversation to load messages.": ["Abre una conversación para cargar mensajes.", "Ouvrez une conversation pour charger les messages.", "Louvri yon konvèsasyon pou wè mesaj yo.", "打开配送会话以加载消息。", "Abra uma conversa para carregar as mensagens."],
  "Rate Your Traveler": ["Califica a tu viajero", "Évaluez votre voyageur", "Bay vwayajè ou nòt", "评价您的旅行者", "Avalie seu viajante"],
  "Rate Traveler": ["Calificar viajero", "Évaluer le voyageur", "Bay vwayajè a nòt", "评价旅行者", "Avaliar viajante"],
  "How was your delivery experience?": ["¿Cómo fue tu experiencia de entrega?", "Comment s'est passée votre livraison ?", "Kijan eksperyans livrezon ou te ye?", "您的配送体验如何？", "Como foi sua experiência de entrega?"],
  "Select a rating": ["Selecciona una calificación", "Sélectionnez une note", "Chwazi yon nòt", "选择评分", "Selecione uma avaliação"],
  "Share your experience with this Traveler...": ["Comparte tu experiencia con este viajero...", "Partagez votre expérience avec ce voyageur...", "Pataje eksperyans ou ak vwayajè sa a...", "分享您与这位旅行者的体验...", "Compartilhe sua experiência com este viajante..."],
  "Submit Rating": ["Enviar calificación", "Envoyer la note", "Voye nòt la", "提交评分", "Enviar avaliação"],
  "Rating Submitted": ["Calificación enviada", "Note envoyée", "Nòt la voye", "评分已提交", "Avaliação enviada"],
  "Already Rated": ["Ya calificado", "Déjà évalué", "Nòt deja bay", "已评价", "Já avaliado"],
  "Connect Stripe Account": ["Conectar cuenta de Stripe", "Connecter un compte Stripe", "Konekte kont Stripe", "连接 Stripe 账户", "Conectar conta Stripe"],
  "Stripe Connect Payouts": ["Pagos con Stripe Connect", "Paiements Stripe Connect", "Peman Stripe Connect", "Stripe Connect 收款", "Pagamentos Stripe Connect"],
  "Connect Stripe to receive delivery payouts.": ["Conecta Stripe para recibir tus pagos.", "Connectez Stripe pour recevoir vos paiements.", "Konekte Stripe pou resevwa peman ou.", "连接 Stripe 以接收配送收入。", "Conecte o Stripe para receber seus pagamentos."],
  "Continue Stripe Onboarding": ["Continuar registro en Stripe", "Continuer l'inscription Stripe", "Kontinye enskripsyon Stripe", "继续 Stripe 开户", "Continuar cadastro no Stripe"],
  "Stripe Connected": ["Stripe conectado", "Stripe connecté", "Stripe konekte", "Stripe 已连接", "Stripe conectado"],
  "Not Connected": ["No conectado", "Non connecté", "Pa konekte", "未连接", "Não conectado"],
  "Refresh Status": ["Actualizar estado", "Actualiser le statut", "Mete estati ajou", "刷新状态", "Atualizar status"],
  "Payout Balance": ["Saldo de pagos", "Solde des paiements", "Balans peman", "收款余额", "Saldo de pagamentos"],
  "Instant Withdraw": ["Retiro instantáneo", "Retrait instantané", "Retrè imedya", "即时提现", "Saque instantâneo"],
  "Available for Instant Withdrawal": ["Disponible para retiro instantáneo", "Disponible pour retrait instantané", "Disponib pou retrè imedya", "可即时提现", "Disponível para saque instantâneo"],
  "Standard Available": ["Disponible estándar", "Disponible standard", "Disponib nòmal", "标准可用", "Disponível padrão"],
  "Tell us what you need help with. Our support team will review your request.": ["Cuéntanos en qué necesitas ayuda. Nuestro equipo revisará tu solicitud.", "Dites-nous comment vous aider. Notre équipe examinera votre demande.", "Di nou ki èd ou bezwen. Ekip sipò nou an ap gade demann ou.", "告诉我们您需要什么帮助，我们的客服团队会查看您的请求。", "Diga como podemos ajudar. Nossa equipe analisará sua solicitação."],
  "Issue Category": ["Categoría del problema", "Catégorie du problème", "Kategori pwoblèm", "问题类别", "Categoria do problema"],
  "Delivery Issues": ["Problemas de entrega", "Problèmes de livraison", "Pwoblèm livrezon", "配送问题", "Problemas de entrega"],
  "Payout Questions": ["Preguntas sobre pagos", "Questions sur les paiements", "Kesyon sou peman", "收款问题", "Dúvidas sobre pagamentos"],
  "Verification Problems": ["Problemas de verificación", "Problèmes de vérification", "Pwoblèm verifikasyon", "验证问题", "Problemas de verificação"],
  "Technical Problems": ["Problemas técnicos", "Problèmes techniques", "Pwoblèm teknik", "技术问题", "Problemas técnicos"],
  "Other Questions": ["Otras preguntas", "Autres questions", "Lòt kesyon", "其他问题", "Outras dúvidas"],
  "Related Delivery": ["Entrega relacionada", "Livraison concernée", "Livrezon ki konsène", "相关配送", "Entrega relacionada"],
  "Not related to a specific delivery": ["No relacionado con una entrega", "Sans lien avec une livraison", "Pa gen rapò ak yon livrezon", "与特定配送无关", "Não relacionado a uma entrega"],
  "No picked-up jobs yet.": ["Aún no hay trabajos recogidos.", "Aucune mission récupérée.", "Poko gen travay ranmase.", "暂无已取件任务。", "Nenhum trabalho coletado ainda."],
  "Account updated successfully!": ["¡Cuenta actualizada!", "Compte mis à jour !", "Kont lan mete ajou!", "账户已更新！", "Conta atualizada!"],
  "An error occurred while saving changes.": ["Ocurrió un error al guardar.", "Une erreur s'est produite lors de l'enregistrement.", "Gen yon erè pandan n ap anrejistre.", "保存时出错。", "Ocorreu um erro ao salvar."],
  "You can add up to 5 photos.": ["Puedes agregar hasta 5 fotos.", "Vous pouvez ajouter jusqu'à 5 photos.", "Ou ka ajoute jiska 5 foto.", "最多可添加 5 张照片。", "Você pode adicionar até 5 fotos."],
  "Please upload a delivery photo.": ["Sube una foto de entrega.", "Téléversez une photo de livraison.", "Tanpri telechaje yon foto livrezon.", "请上传配送照片。", "Envie uma foto da entrega."],
  "Please provide a signature.": ["Agrega una firma.", "Veuillez signer.", "Tanpri siyen.", "请提供签名。", "Forneça uma assinatura."],
  "Please provide a recipient signature.": ["Agrega la firma del destinatario.", "Ajoutez la signature du destinataire.", "Tanpri mete siyati moun k ap resevwa a.", "请提供收件人签名。", "Forneça a assinatura do destinatário."],
  "Please enter who signed for the delivery.": ["Indica quién firmó la entrega.", "Indiquez qui a signé.", "Tanpri antre non moun ki siyen an.", "请输入签收人。", "Informe quem assinou a entrega."],
  "Please enter package weight.": ["Ingresa el peso del paquete.", "Saisissez le poids du colis.", "Tanpri antre pwa koli a.", "请输入包裹重量。", "Digite o peso do pacote."],
  "Please complete all sender fields.": ["Completa los datos del remitente.", "Remplissez les champs de l'expéditeur.", "Tanpri ranpli tout chan moun k ap voye a.", "请填写所有寄件人信息。", "Preencha os dados do remetente."],
  "Please complete all receiver fields.": ["Completa los datos del destinatario.", "Remplissez les champs du destinataire.", "Tanpri ranpli tout chan moun k ap resevwa a.", "请填写所有收件人信息。", "Preencha os dados do destinatário."],
  "Please calculate a valid delivery price before continuing.": ["Calcula un precio válido antes de continuar.", "Calculez un prix valide avant de continuer.", "Tanpri kalkile yon pri valab anvan ou kontinye.", "请先计算有效的配送价格。", "Calcule um preço válido antes de continuar."],
  "Pickup and dropoff must have valid coordinates.": ["La recogida y la entrega deben tener direcciones válidas.", "Le retrait et le dépôt doivent avoir des adresses valides.", "Ranmasaj ak depo dwe gen adrès valab.", "取件和送达地址必须有效。", "Coleta e entrega devem ter endereços válidos."],
  "Pickup code is required.": ["Se requiere el código de recogida.", "Le code de retrait est requis.", "Kòd ranmasaj la obligatwa.", "必须输入取件码。", "O código de coleta é obrigatório."],
  "Pickup verified successfully!": ["¡Recogida verificada!", "Retrait vérifié !", "Ranmasaj la verifye!", "取件已验证！", "Coleta verificada!"],
  "Delivery completed successfully!": ["¡Entrega completada!", "Livraison terminée !", "Livrezon an fini!", "配送已完成！", "Entrega concluída!"],
  "Delivery created successfully. Please complete payment to publish the delivery.": ["Entrega creada. Completa el pago para publicarla.", "Livraison créée. Finalisez le paiement pour la publier.", "Livrezon kreye. Tanpri fini peman an pou pibliye li.", "配送已创建。请完成付款以发布。", "Entrega criada. Conclua o pagamento para publicá-la."],
  "Payment confirmed. Your delivery is now published and available to travelers.": ["Pago confirmado. Tu entrega ya está publicada.", "Paiement confirmé. Votre livraison est publiée.", "Peman konfime. Livrezon ou pibliye kounye a.", "付款已确认。您的配送已发布。", "Pagamento confirmado. Sua entrega foi publicada."],
  "Payment Complete": ["Pago completado", "Paiement terminé", "Peman fini", "付款完成", "Pagamento concluído"],
  "Processing payment...": ["Procesando pago...", "Traitement du paiement...", "N ap trete peman an...", "正在处理付款...", "Processando pagamento..."],
  "Preparing payment...": ["Preparando pago...", "Préparation du paiement...", "N ap prepare peman an...", "正在准备付款...", "Preparando pagamento..."],
  "Creating delivery...": ["Creando entrega...", "Création de la livraison...", "N ap kreye livrezon an...", "正在创建配送...", "Criando entrega..."],
  "Your session has expired. Please log in again.": ["Tu sesión expiró. Inicia sesión de nuevo.", "Votre session a expiré. Reconnectez-vous.", "Sesyon ou fini. Tanpri konekte ankò.", "会话已过期，请重新登录。", "Sua sessão expirou. Entre novamente."],
  "Message sent.": ["Mensaje enviado.", "Message envoyé.", "Mesaj la voye.", "消息已发送。", "Mensagem enviada."],
  "Message delivered.": ["Mensaje entregado.", "Message remis.", "Mesaj la rive.", "消息已送达。", "Mensagem entregue."],
  "Sending message...": ["Enviando mensaje...", "Envoi du message...", "N ap voye mesaj la...", "正在发送消息...", "Enviando mensagem..."],
  "Type a message before sending.": ["Escribe un mensaje antes de enviar.", "Écrivez un message avant d'envoyer.", "Ekri yon mesaj anvan ou voye.", "请先输入消息。", "Digite uma mensagem antes de enviar."],
  "Loading conversation...": ["Cargando conversación...", "Chargement de la conversation...", "N ap chaje konvèsasyon an...", "正在加载会话...", "Carregando conversa..."],
  "SMS isn't available for this country yet.": ["Los SMS aún no están disponibles para este país.", "Les SMS ne sont pas encore disponibles pour ce pays.", "SMS poko disponib pou peyi sa a.", "该国家/地区暂不支持短信。", "O SMS ainda não está disponível para este país."],
  "Back to My Deliveries": ["Volver a mis entregas", "Retour à mes livraisons", "Tounen nan livrezon mwen yo", "返回我的配送", "Voltar às minhas entregas"]
};

(function () {
  const LANG_COLUMN = { es: 0, fr: 1, ht: 2, zh: 3, pt: 4 };
  const originalText = new WeakMap();
  const originalAttr = new WeakMap();
  const lastWritten = new WeakMap();

  // Matches exact English text, keeping a trailing colon if present.
  function translatePhrase(text) {
    const column = LANG_COLUMN[activeLang];
    if (column === undefined) return text;

    const trimmed = text.trim();
    if (!trimmed) return text;

    const colon = trimmed.endsWith(":");
    const base = colon ? trimmed.slice(0, -1) : trimmed;
    const row = PHRASES[base];

    if (!row) return text;

    return text.replace(trimmed, `${row[column]}${colon ? ":" : ""}`);
  }

  function translateNode(node) {
    if (lastWritten.get(node) !== node.nodeValue) {
      originalText.set(node, node.nodeValue);
    }

    const next = translatePhrase(originalText.get(node));

    if (node.nodeValue !== next) node.nodeValue = next;
    lastWritten.set(node, next);
  }

  function translateAttribute(element) {
    if (element.hasAttribute("data-i18n-placeholder")) return;

    if (!originalAttr.has(element)) {
      originalAttr.set(element, element.getAttribute("placeholder"));
    }

    const next = translatePhrase(originalAttr.get(element));

    if (element.getAttribute("placeholder") !== next) {
      element.setAttribute("placeholder", next);
    }
  }

  function translateTree(root) {
    if (!root) return;

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;

        return !parent || /^(SCRIPT|STYLE|OPTION)$/.test(parent.tagName) ||
          t(parent.closest("[data-i18n]")?.getAttribute("data-i18n"))
          ? NodeFilter.FILTER_REJECT
          : NodeFilter.FILTER_ACCEPT;
      }
    });

    while (walker.nextNode()) translateNode(walker.currentNode);

    root.querySelectorAll?.("[placeholder]").forEach(translateAttribute);
  }

  function applyAll() {
    applyTranslations();
    translateTree(document.body);
  }

  function setLanguage(lang) {
    activeLang = LANGUAGES.includes(lang) ? lang : "en";

    try { localStorage.setItem("preferredLanguage", activeLang); } catch (e) {}

    document.documentElement.lang = activeLang;

    const selector = document.getElementById("languageSelector");
    if (selector) selector.value = activeLang;

    applyAll();
  }

  function startingLanguage() {
    let saved = null;

    try { saved = localStorage.getItem("preferredLanguage"); } catch (e) {}

    const browser = (navigator.language || "en").slice(0, 2);
    return saved || (LANGUAGES.includes(browser) ? browser : "en");
  }

  // Alerts come from code, so they're translated as they appear.
  const nativeAlert = window.alert.bind(window);
  window.alert = (message) => nativeAlert(translatePhrase(String(message)));

  window.setLanguage = setLanguage;
  window.t = t;

  function start() {
    setLanguage(startingLanguage());

    document.getElementById("languageSelector")
      ?.addEventListener("change", (event) => setLanguage(event.target.value));

    // Screens drawn later by sender.js and traveler.js.
    let queued = false;

    new MutationObserver(() => {
      if (queued) return;
      queued = true;

      requestAnimationFrame(() => {
        queued = false;
        applyAll();
      });
    }).observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
