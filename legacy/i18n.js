/* =========================================================
   i18n.js — Cambio de idioma (Español / English / Português)
   - El sitio está escrito en español: el español es la "clave" de cada
     traducción, así que el HTML y los scripts no necesitan cambios.
   - Traduce textos, placeholders, alt/title/aria-label y botones, tanto
     los fijos como los que generan los scripts (un MutationObserver
     traduce lo nuevo que aparece en pantalla).
   - Los datos que carga el administrador (nombres de shows, lugares,
     descripciones nuevas) se muestran tal como fueron escritos.
   - Expone T("texto") para textos que salen del DOM (PDF, e-mail, etc.).
   - El panel de administración (admin.html) queda en español a propósito.
   ========================================================= */

const TS_I18N = (() => {
  const IDIOMAS = [["es", "Español"], ["en", "English"], ["pt", "Português"]];
  const CLAVE = "ts_idioma";

  const MESES = {
    es: ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"],
    en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
    pt: ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"]
  };

  /* ---------- Textos exactos: [español, inglés, portugués] ---------- */
  const DICT = [
    // Encabezado, menú y pie
    ["Tu entrada a los mejores shows en vivo", "Your ticket to the best live shows", "Seu ingresso para os melhores shows ao vivo"],
    ["SOPORTE", "SUPPORT", "SUPORTE"],
    ["INGRESAR / REGISTRARSE", "LOG IN / SIGN UP", "ENTRAR / CADASTRAR-SE"],
    ["Buscar", "Search", "Buscar"],
    ["Buscar Artista o Evento", "Search artist or event", "Buscar artista ou evento"],
    ["Inicio", "Home", "Início"],
    ["Lista de eventos", "Event list", "Lista de eventos"],
    ["Listado (Tabla)", "Listing (Table)", "Listagem (Tabela)"],
    ["Listado (Cajas)", "Listing (Cards)", "Listagem (Cartões)"],
    ["Ficha de Ticket", "Ticket details", "Ficha do ingresso"],
    ["Comprar", "Buy", "Comprar"],
    ["Mis tickets", "My tickets", "Meus ingressos"],
    ["Encuesta", "Survey", "Pesquisa"],
    ["Logueo de usuario", "User login", "Login de usuário"],
    ["Información de contacto", "Contact information", "Informações de contato"],
    ["Desarrollado como proyecto académico, con el objetivo de difundir shows, recitales y espectáculos en vivo, y ser el enlace directo para conseguir tus entradas a los mejores eventos.",
      "Developed as an academic project, with the goal of promoting shows, concerts and live entertainment, and being the direct link to get your tickets to the best events.",
      "Desenvolvido como projeto acadêmico, com o objetivo de divulgar shows, concertos e espetáculos ao vivo, e ser o elo direto para conseguir seus ingressos para os melhores eventos."],
    ["📍 Av. Corrientes 1500, Buenos Aires, Argentina", "📍 1500 Corrientes Ave., Buenos Aires, Argentina", "📍 Av. Corrientes 1500, Buenos Aires, Argentina"],
    ["📱 WhatsApp:", "📱 WhatsApp:", "📱 WhatsApp:"],
    ["Comuníquese con nosotros", "Contact us", "Fale conosco"],
    ["Llámenos al teléfono", "Call us at", "Ligue para nós"],
    ["Mi cuenta", "My account", "Minha conta"],
    ["Administración", "Administration", "Administração"],
    ["Más opciones", "More options", "Mais opções"],
    ["Sobre nosotros", "About us", "Sobre nós"],
    ["Novedades", "News", "Novidades"],
    ["Contacte con nosotros", "Get in touch", "Entre em contato"],
    ["Aceptamos distintos medios de pago", "We accept several payment methods", "Aceitamos diversos meios de pagamento"],
    ["Transferencia", "Bank transfer", "Transferência"],
    ["Síguenos en las redes", "Follow us on social media", "Siga-nos nas redes"],
    ["TicketShow © 2026 - Todos los derechos reservados", "TicketShow © 2026 - All rights reserved", "TicketShow © 2026 - Todos os direitos reservados"],
    ["Idioma", "Language", "Idioma"],
    ["Menú principal", "Main menu", "Menu principal"],
    ["Ingresar", "Log in", "Entrar"],
    ["Desde", "From", "A partir de"],
    ["Agotado", "Sold out", "Esgotado"],
    ["No encontramos shows con esa búsqueda.", "We found no shows matching that search.", "Não encontramos shows com essa busca."],
    ["📲 Instalar app", "📲 Install app", "📲 Instalar app"],
    ["Ir a comprar entradas →", "Go buy tickets →", "Ir comprar ingressos →"],
    ["ene", "Jan", "jan"], ["feb", "Feb", "fev"], ["mar", "Mar", "mar"], ["abr", "Apr", "abr"], ["may", "May", "mai"], ["jun", "Jun", "jun"],
    ["jul", "Jul", "jul"], ["ago", "Aug", "ago"], ["sep", "Sep", "set"], ["oct", "Oct", "out"], ["nov", "Nov", "nov"], ["dic", "Dec", "dez"],
    ["Apple Music ↗", "Apple Music ↗", "Apple Music ↗"],

    // Portada y listados
    ["Cartelera de Shows", "Show Lineup", "Programação de Shows"],
    ["Próximos Shows", "Upcoming Shows", "Próximos Shows"],
    ["Bienvenido a TicketShow, el lugar donde conseguís tus entradas para los recitales y shows más esperados del año. A continuación, un adelanto de nuestra cartelera:",
      "Welcome to TicketShow, the place to get your tickets for the most anticipated concerts and shows of the year. Here is a preview of our lineup:",
      "Bem-vindo ao TicketShow, o lugar onde você consegue ingressos para os shows e concertos mais esperados do ano. A seguir, uma prévia da nossa programação:"],
    ["Visitá la sección de", "Visit the", "Visite a seção de"],
    ["listado de eventos", "event listing", "listagem de eventos"],
    ["para ver todos los shows disponibles.", "section to see all the available shows.", "para ver todos os shows disponíveis."],
    ["Listado de Eventos", "Event Listing", "Listagem de Eventos"],
    ["Evento", "Event", "Evento"],
    ["Fecha", "Date", "Data"],
    ["Lugar", "Venue", "Local"],
    ["Precio desde", "Price from", "Preço a partir de"],
    ["Acción", "Action", "Ação"],
    ["Ver más", "See more", "Ver mais"],
    ["Sin reseñas aún", "No reviews yet", "Sem avaliações ainda"],
    ["A confirmar", "To be announced", "A confirmar"],

    // Ficha del show
    ["Cargando...", "Loading...", "Carregando..."],
    ["Fecha:", "Date:", "Data:"],
    ["Lugar:", "Venue:", "Local:"],
    ["Descripción:", "Description:", "Descrição:"],
    ["Tipos de entrada disponibles", "Available ticket types", "Tipos de ingresso disponíveis"],
    ["Precio desde:", "Price from:", "Preço a partir de:"],
    ["Comprar entrada", "Buy ticket", "Comprar ingresso"],
    ["Entradas agotadas", "Sold out", "Ingressos esgotados"],
    ["Agotada", "Sold out", "Esgotado"],
    ["Evento no encontrado", "Event not found", "Evento não encontrado"],
    ["No encontramos ese show. Volvé a la", "We couldn't find that show. Go back to the", "Não encontramos esse show. Volte para a"],
    ["cartelera", "lineup", "programação"],
    ["Compartí este show", "Share this show", "Compartilhe este show"],
    ["Copiar enlace", "Copy link", "Copiar link"],
    ["¡Enlace copiado!", "Link copied!", "Link copiado!"],
    ["Compartir…", "Share…", "Compartilhar…"],
    ["Instagram del artista", "Artist's Instagram", "Instagram do artista"],
    ["Sobre el artista", "About the artist", "Sobre o artista"],
    ["No pudimos cargar la información del artista en este momento.", "We couldn't load the artist information right now.", "Não foi possível carregar as informações do artista agora."],
    ["Reseñas y valoraciones", "Reviews and ratings", "Avaliações e notas"],
    ["Dejá tu valoración", "Leave your rating", "Deixe sua avaliação"],
    ["E-mail de tu compra (opcional, para el sello \"Compra verificada\"):", "Your purchase e-mail (optional, for the \"Verified purchase\" badge):", "E-mail da sua compra (opcional, para o selo \"Compra verificada\"):"],
    ["Comentario:", "Comment:", "Comentário:"],
    ["Publicar reseña", "Post review", "Publicar avaliação"],
    ["Compra verificada", "Verified purchase", "Compra verificada"],
    ["Todavía no hay reseñas de este show. ¡Sé el primero en opinar!", "There are no reviews for this show yet. Be the first to share your opinion!", "Ainda não há avaliações deste show. Seja o primeiro a opinar!"],
    ["¡Gracias! Tu reseña fue publicada.", "Thank you! Your review has been posted.", "Obrigado! Sua avaliação foi publicada."],
    ["Elegí un puntaje de 1 a 5 estrellas.", "Choose a rating from 1 to 5 stars.", "Escolha uma nota de 1 a 5 estrelas."],
    ["Ingresá tu nombre.", "Enter your name.", "Digite seu nome."],
    ["Contanos cómo fue el show...", "Tell us how the show was...", "Conte-nos como foi o show..."],
    ["Ej: Juan P.", "E.g. John P.", "Ex: João P."],
    ["Puntaje de 1 a 5 estrellas", "Rating from 1 to 5 stars", "Nota de 1 a 5 estrelas"],
    ["1 estrella", "1 star", "1 estrela"], ["2 estrellas", "2 stars", "2 estrelas"], ["3 estrellas", "3 stars", "3 estrelas"],
    ["4 estrellas", "4 stars", "4 estrelas"], ["5 estrellas", "5 stars", "5 estrelas"],
    ["Próximamente más información.", "More information coming soon.", "Mais informações em breve."],
    ["BTS, acrónimo de Bangtan Sonyeondan o “Beyond the Scene”, es una boyband surcoreana nominada al GRAMMY que ha conquistado a millones de fans en todo el mundo desde su debut en junio de 2013. Sus integrantes son RM, Jin, SUGA, j-hope, Jimin, V y Jung Kook.",
      "BTS, short for Bangtan Sonyeondan or “Beyond the Scene”, is a GRAMMY-nominated South Korean boy band that has won over millions of fans worldwide since its debut in June 2013. Its members are RM, Jin, SUGA, j-hope, Jimin, V and Jung Kook.",
      "BTS, sigla de Bangtan Sonyeondan ou “Beyond the Scene”, é uma boy band sul-coreana indicada ao GRAMMY que conquistou milhões de fãs em todo o mundo desde sua estreia em junho de 2013. Seus integrantes são RM, Jin, SUGA, j-hope, Jimin, V e Jung Kook."],
    ["Olivia Wald presenta su show en vivo con un repertorio que recorre sus mayores éxitos y canciones nuevas.",
      "Olivia Wald presents her live show with a repertoire that runs through her biggest hits and new songs.",
      "Olivia Wald apresenta seu show ao vivo com um repertório que percorre seus maiores sucessos e canções novas."],
    ["La banda estadounidense liderada por Adam Levine llega a Buenos Aires con sus grandes hits del pop rock.",
      "The American band led by Adam Levine comes to Buenos Aires with its biggest pop rock hits.",
      "A banda americana liderada por Adam Levine chega a Buenos Aires com seus grandes hits do pop rock."],
    ["Andrés Calamaro vuelve a los escenarios con un show que repasa las canciones más queridas de su carrera.",
      "Andrés Calamaro returns to the stage with a show that revisits the most beloved songs of his career.",
      "Andrés Calamaro volta aos palcos com um show que revisita as canções mais queridas de sua carreira."],
    ["La banda de rock liderada por Dave Grohl llega con su gira en vivo.",
      "The rock band led by Dave Grohl arrives with its live tour.",
      "A banda de rock liderada por Dave Grohl chega com sua turnê ao vivo."],

    // Compra
    ["Formulario de Compra", "Purchase Form", "Formulário de Compra"],
    ["Nombre del cliente:", "Customer name:", "Nome do cliente:"],
    ["Ej: Juan Pérez", "E.g. John Smith", "Ex: João Silva"],
    ["Dirección:", "Address:", "Endereço:"],
    ["Ej: Av. Siempre Viva 123", "E.g. 123 Main St.", "Ex: Rua das Flores 123"],
    ["Teléfono:", "Phone:", "Telefone:"],
    ["Ej: 11-2345-6789", "E.g. 11-2345-6789", "Ex: 11-2345-6789"],
    ["E-mail (acá te enviamos tus tickets):", "E-mail (we'll send your tickets here):", "E-mail (enviaremos seus ingressos para cá):"],
    ["Ej: juan@correo.com", "E.g. john@mail.com", "Ex: joao@email.com"],
    ["Show:", "Show:", "Show:"],
    ["Tipo de entrada:", "Ticket type:", "Tipo de ingresso:"],
    ["Cantidad:", "Quantity:", "Quantidade:"],
    ["Medio de pago", "Payment method", "Meio de pagamento"],
    ["Elegí cómo vas a pagar.", "Choose how you will pay.", "Escolha como vai pagar."],
    ["Selección de medio de pago únicamente: en esta versión no se procesa ningún cobro ni se piden datos de tarjeta.",
      "Payment method selection only: this version does not process any charge or ask for card details.",
      "Apenas seleção do meio de pagamento: nesta versão nenhuma cobrança é processada nem dados de cartão são solicitados."],
    ["Confirmar compra", "Confirm purchase", "Confirmar compra"],
    ["Mercado Pago", "Mercado Pago", "Mercado Pago"],
    ["American Express", "American Express", "American Express"],
    ["Transferencia bancaria", "Bank transfer", "Transferência bancária"],
    ["Efectivo (Pago Fácil / Rapipago)", "Cash (Pago Fácil / Rapipago)", "Dinheiro (Pago Fácil / Rapipago)"],
    ["Pagarás con tu cuenta de Mercado Pago.", "You will pay with your Mercado Pago account.", "Você pagará com sua conta do Mercado Pago."],
    ["Pagarás con tarjeta Visa (crédito o débito).", "You will pay with a Visa card (credit or debit).", "Você pagará com cartão Visa (crédito ou débito)."],
    ["Pagarás con tarjeta Mastercard (crédito o débito).", "You will pay with a Mastercard card (credit or debit).", "Você pagará com cartão Mastercard (crédito ou débito)."],
    ["Pagarás con tarjeta American Express.", "You will pay with an American Express card.", "Você pagará com cartão American Express."],
    ["Pagarás por transferencia bancaria.", "You will pay by bank transfer.", "Você pagará por transferência bancária."],
    ["Pagarás en efectivo en una sucursal de Pago Fácil o Rapipago.", "You will pay in cash at a Pago Fácil or Rapipago branch.", "Você pagará em dinheiro em uma agência Pago Fácil ou Rapipago."],
    ["Esta entrada está agotada.", "This ticket is sold out.", "Este ingresso está esgotado."],
    ["Ingresá un e-mail válido: ahí enviamos tus tickets.", "Enter a valid e-mail: we send your tickets there.", "Digite um e-mail válido: é para lá que enviamos seus ingressos."],
    ["Elegí un show y un tipo de entrada.", "Choose a show and a ticket type.", "Escolha um show e um tipo de ingresso."],
    ["Elegí un medio de pago.", "Choose a payment method.", "Escolha um meio de pagamento."],
    ["¡Compra confirmada! Generando tus tickets electrónicos...", "Purchase confirmed! Generating your e-tickets...", "Compra confirmada! Gerando seus ingressos eletrônicos..."],
    ["El show elegido no existe.", "The selected show does not exist.", "O show escolhido não existe."],
    ["El tipo de entrada elegido no existe.", "The selected ticket type does not exist.", "O tipo de ingresso escolhido não existe."],
    ["La cantidad debe ser al menos 1.", "The quantity must be at least 1.", "A quantidade deve ser pelo menos 1."],
    ["Esa entrada está agotada.", "That ticket is sold out.", "Esse ingresso está esgotado."],

    // Tickets electrónicos
    ["No encontramos esa compra", "We couldn't find that purchase", "Não encontramos essa compra"],
    ["Mis tickets electrónicos", "My e-tickets", "Meus ingressos eletrônicos"],
    ["Tus tickets electrónicos", "Your e-tickets", "Seus ingressos eletrônicos"],
    ["⬇ Descargar PDF", "⬇ Download PDF", "⬇ Baixar PDF"],
    ["⬇ Descargar PDF (todos)", "⬇ Download PDF (all)", "⬇ Baixar PDF (todos)"],
    ["✉ Enviar por e-mail", "✉ Send by e-mail", "✉ Enviar por e-mail"],
    ["🖨 Imprimir", "🖨 Print", "🖨 Imprimir"],
    ["Descargar PDF", "Download PDF", "Baixar PDF"],
    ["Entrada:", "Ticket:", "Ingresso:"],
    ["Titular:", "Holder:", "Titular:"],
    ["Ya utilizado", "Already used", "Já utilizado"],
    ["Presentá el QR (en el celular o impreso) en el acceso del show. Cada código es válido para una sola persona.",
      "Show the QR code (on your phone or printed) at the show entrance. Each code is valid for one person only.",
      "Apresente o QR (no celular ou impresso) na entrada do show. Cada código é válido para uma única pessoa."],
    ["★ Dejar una reseña del show", "★ Review the show", "★ Avaliar o show"],
    ["Encuesta de satisfacción", "Satisfaction survey", "Pesquisa de satisfação"],
    ["Responder encuesta de satisfacción", "Take the satisfaction survey", "Responder pesquisa de satisfação"],
    ["No se pudo cargar el generador de PDF.", "The PDF generator could not be loaded.", "Não foi possível carregar o gerador de PDF."],
    ["No pudimos enviar el e-mail. Probá de nuevo o descargá el PDF.", "We couldn't send the e-mail. Try again or download the PDF.", "Não foi possível enviar o e-mail. Tente novamente ou baixe o PDF."],
    ["¿A qué e-mail enviamos los tickets?", "Which e-mail should we send the tickets to?", "Para qual e-mail enviamos os ingressos?"],
    ["Copiá el enlace:", "Copy the link:", "Copie o link:"],
    ["Código QR del ticket", "Ticket QR code", "Código QR do ingresso"],

    // Mis tickets
    ["Ingresá el e-mail con el que compraste para volver a ver, descargar o reenviar tus entradas.",
      "Enter the e-mail you used to buy in order to view, download or resend your tickets.",
      "Digite o e-mail usado na compra para ver, baixar ou reenviar seus ingressos."],
    ["E-mail de la compra:", "Purchase e-mail:", "E-mail da compra:"],
    ["Buscar mis compras", "Find my purchases", "Buscar minhas compras"],
    ["Ingresá un e-mail válido.", "Enter a valid e-mail.", "Digite um e-mail válido."],
    ["No encontramos compras con ese e-mail en este dispositivo.", "We found no purchases with that e-mail on this device.", "Não encontramos compras com esse e-mail neste dispositivo."],
    ["Ver tickets (QR / PDF)", "View tickets (QR / PDF)", "Ver ingressos (QR / PDF)"],

    // Encuesta
    ["Encuesta de Satisfacción del Usuario", "User Satisfaction Survey", "Pesquisa de Satisfação do Usuário"],
    ["Contanos cómo fue tu experiencia comprando entradas en TicketShow. Nos ayuda a mejorar el servicio.",
      "Tell us about your experience buying tickets on TicketShow. It helps us improve the service.",
      "Conte-nos como foi sua experiência comprando ingressos no TicketShow. Isso nos ajuda a melhorar o serviço."],
    ["¿Qué tan satisfecho/a quedaste con tu compra?", "How satisfied are you with your purchase?", "Quão satisfeito(a) você ficou com sua compra?"],
    ["Muy satisfecho", "Very satisfied", "Muito satisfeito"], ["Satisfecho", "Satisfied", "Satisfeito"], ["Neutral", "Neutral", "Neutro"],
    ["Insatisfecho", "Dissatisfied", "Insatisfeito"], ["Muy insatisfecho", "Very dissatisfied", "Muito insatisfeito"],
    ["¿Recomendarías TicketShow a un amigo?", "Would you recommend TicketShow to a friend?", "Você recomendaria o TicketShow a um amigo?"],
    ["Sí", "Yes", "Sim"], ["No", "No", "Não"],
    ["Contanos más sobre tu experiencia (opcional):", "Tell us more about your experience (optional):", "Conte-nos mais sobre sua experiência (opcional):"],
    ["Ej: El proceso de compra fue rápido y sin problemas...", "E.g. The purchase process was quick and hassle-free...", "Ex: O processo de compra foi rápido e sem problemas..."],
    ["Enviar encuesta", "Submit survey", "Enviar pesquisa"],
    ["Por favor, elegí una opción de satisfacción antes de enviar.", "Please choose a satisfaction option before submitting.", "Por favor, escolha uma opção de satisfação antes de enviar."],
    ["Por favor, indicá si recomendarías TicketShow antes de enviar.", "Please indicate whether you would recommend TicketShow before submitting.", "Por favor, indique se recomendaria o TicketShow antes de enviar."],
    ["¡Gracias por completar la encuesta! Tu opinión nos ayuda a mejorar la experiencia en TicketShow.",
      "Thank you for completing the survey! Your opinion helps us improve the TicketShow experience.",
      "Obrigado por responder à pesquisa! Sua opinião nos ajuda a melhorar a experiência no TicketShow."],
    ["Satisfacción:", "Satisfaction:", "Satisfação:"],
    ["¿Recomendaría TicketShow?:", "Would you recommend TicketShow?:", "Recomendaria o TicketShow?:"],
    ["Análisis de sentimiento del comentario (RNA simplificada):", "Comment sentiment analysis (simplified ANN):", "Análise de sentimento do comentário (RNA simplificada):"],
    ["Positivo", "Positive", "Positivo"], ["Negativo", "Negative", "Negativo"], ["Neutro", "Neutral", "Neutro"],
    ["Sin comentario", "No comment", "Sem comentário"],
    ["No pudimos enviar tu encuesta. Probá nuevamente más tarde.", "We couldn't send your survey. Please try again later.", "Não foi possível enviar sua pesquisa. Tente novamente mais tarde."],
    ["La encuesta de satisfacción se habilita al finalizar una compra.", "The satisfaction survey is available once you finish a purchase.", "A pesquisa de satisfação fica disponível ao finalizar uma compra."],
    ["Ir a comprar entradas", "Go buy tickets", "Ir comprar ingressos"],

    // Login, registro y soporte
    ["Iniciar sesión", "Log in", "Entrar"],
    ["¿No tenés una cuenta?", "Don't have an account?", "Não tem uma conta?"],
    ["Creá una aquí", "Create one here", "Crie uma aqui"],
    ["E-mail:", "E-mail:", "E-mail:"], ["E-mail", "E-mail", "E-mail"],
    ["Contraseña:", "Password:", "Senha:"], ["Contraseña", "Password", "Senha"],
    ["Ingresar", "Log in", "Entrar"],
    ["Crear cuenta", "Create account", "Criar conta"],
    ["¿Ya tenés una cuenta?", "Already have an account?", "Já tem uma conta?"],
    ["Ingresá aquí", "Log in here", "Entre aqui"],
    ["Confirmar contraseña:", "Confirm password:", "Confirmar senha:"], ["Confirmar contraseña", "Confirm password", "Confirmar senha"],
    ["Nombre:", "First name:", "Nome:"], ["Nombre", "First name", "Nome"],
    ["Apellido:", "Last name:", "Sobrenome:"], ["Apellido", "Last name", "Sobrenome"],
    ["País de residencia:", "Country of residence:", "País de residência:"],
    ["Brasil", "Brazil", "Brasil"],
    ["Tipo de documento:", "Document type:", "Tipo de documento:"],
    ["Número de DNI", "National ID (DNI) number", "Número do DNI"],
    ["Pasaporte", "Passport", "Passaporte"],
    ["Número de documento:", "Document number:", "Número do documento:"], ["Número de documento", "Document number", "Número do documento"],
    ["Fecha de nacimiento:", "Date of birth:", "Data de nascimento:"],
    ["DD/MM/AAAA", "DD/MM/YYYY", "DD/MM/AAAA"],
    ["Género:", "Gender:", "Gênero:"],
    ["Seleccioná tu género", "Select your gender", "Selecione seu gênero"],
    ["Femenino", "Female", "Feminino"], ["Masculino", "Male", "Masculino"], ["Otro", "Other", "Outro"],
    ["Prefiero no decir", "Prefer not to say", "Prefiro não dizer"],
    ["Suscribirme al newsletter y recibir novedades de giras y espectáculos", "Subscribe to the newsletter and receive news about tours and shows", "Assinar a newsletter e receber novidades sobre turnês e espetáculos"],
    ["Registrarme", "Sign up", "Cadastrar-me"],
    ["Soporte", "Support", "Suporte"],
    ["Ante algún reclamo, por favor contactanos a través de nuestro canal de soporte.", "For any complaint, please contact us through our support channel.", "Em caso de reclamação, entre em contato conosco pelo nosso canal de suporte."],
    ["Número de contacto:", "Contact number:", "Número de contato:"],
    ["Número de contacto: +54 9 376 461-7724", "Contact number: +54 9 376 461-7724", "Número de contato: +54 9 376 461-7724"],
    ["Correo electrónico: ticketshow@gmail.com", "E-mail: ticketshow@gmail.com", "E-mail: ticketshow@gmail.com"],
    ["Horario de atención: Lunes a Viernes de 8:00 a 20:00 hs.", "Opening hours: Monday to Friday, 8:00 am to 8:00 pm.", "Horário de atendimento: segunda a sexta, das 8h às 20h."],

    // Títulos de página
    ["TicketShow - Portada", "TicketShow - Home", "TicketShow - Início"],
    ["TicketShow - Listado en Tabla", "TicketShow - Table Listing", "TicketShow - Listagem em Tabela"],
    ["TicketShow - Listado en Cajas", "TicketShow - Card Listing", "TicketShow - Listagem em Cartões"],
    ["TicketShow - Ficha del Ticket", "TicketShow - Ticket Details", "TicketShow - Ficha do Ingresso"],
    ["TicketShow - Comprar Entradas", "TicketShow - Buy Tickets", "TicketShow - Comprar Ingressos"],
    ["TicketShow - Mis tickets electrónicos", "TicketShow - My e-tickets", "TicketShow - Meus ingressos eletrônicos"],
    ["TicketShow - Mis tickets", "TicketShow - My tickets", "TicketShow - Meus ingressos"],
    ["TicketShow - Encuesta de Satisfacción", "TicketShow - Satisfaction Survey", "TicketShow - Pesquisa de Satisfação"],
    ["TicketShow - Ingresar", "TicketShow - Log in", "TicketShow - Entrar"],
    ["TicketShow - Crear cuenta", "TicketShow - Create account", "TicketShow - Criar conta"],
    ["TicketShow - Soporte", "TicketShow - Support", "TicketShow - Suporte"]
  ];

  /* ---------- Textos con datos variables: [regex, inglés, portugués] ($1.. = capturas) ---------- */
  const PATRONES = [
    [/^Fecha: (.+)$/, "Date: $1", "Data: $1"],
    [/^Precio: (.+)$/, "Price: $1", "Preço: $1"],
    [/^(\d+) disponibles$/, "$1 available", "$1 disponíveis"],
    [/^¡Últimas (\d+)!$/, "Last $1!", "Últimos $1!"],
    [/^(\d+) caracteres restantes$/, "$1 characters left", "$1 caracteres restantes"],
    [/^Quedan (\d+) disponibles \(máximo (\d+) por compra\)\.$/, "$1 left (maximum $2 per purchase).", "Restam $1 disponíveis (máximo $2 por compra)."],
    [/^Solo quedan (\d+) entradas de (.+)\.$/, "Only $1 tickets of $2 left.", "Restam apenas $1 ingressos de $2."],
    [/^(.+) \(agotado\)$/, "$1 (sold out)", "$1 (esgotado)"],
    [/^(.+) - agotada$/, "$1 - sold out", "$1 - esgotado"],
    [/^1 reseña$/, "1 review", "1 avaliação"],
    [/^(\d+) reseñas$/, "$1 reviews", "$1 avaliações"],
    [/^(\d(?:\.\d)?) de 5$/, "$1 out of 5", "$1 de 5"],
    [/^Buscando canciones de (.+)…$/, "Looking for songs by $1…", "Buscando músicas de $1…"],
    [/^No encontramos canciones de "(.+)" en el servicio de música\.$/, "We found no songs by \"$1\" on the music service.", "Não encontramos músicas de \"$1\" no serviço de música."],
    [/^Escuchá un adelanto de (.+) \(vista previa de 30 segundos vía iTunes Search API\):$/, "Listen to a preview of $1 (30-second preview via iTunes Search API):", "Ouça uma prévia de $1 (prévia de 30 segundos via iTunes Search API):"],
    [/^Portada de (.+)$/, "Cover of $1", "Capa de $1"],
    [/^Compra (ORD-\S+)$/, "Order $1", "Compra $1"],
    [/^— (\d+) × (.+) — Total (.+)$/, "— $1 × $2 — Total $3", "— $1 × $2 — Total $3"],
    [/^Medio de pago elegido: (.+)$/, "Payment method chosen: $1", "Meio de pagamento escolhido: $1"],
    [/^\((\d+) de (\d+)\)$/, "($1 of $2)", "($1 de $2)"],
    [/^Compra (\S+) · (.+) · (.+)$/, "Order $1 · $2 · $3", "Compra $1 · $2 · $3"],
    [/^Enviamos tus tickets a (.+)\.$/, "We sent your tickets to $1.", "Enviamos seus ingressos para $1."],
    [/^Abrimos tu aplicación de correo con los tickets para (.+)\. Revisá y presioná enviar\.$/, "We opened your mail app with the tickets for $1. Review and press send.", "Abrimos seu aplicativo de e-mail com os ingressos para $1. Revise e pressione enviar."],
    // Textos que salen del DOM (PDF, e-mail, compartir)
    [/^Entrada (\d+) de (\d+)$/, "Ticket $1 of $2", "Ingresso $1 de $2"],
    [/^Compra (\S+) - Válido para una persona\. Presentá este QR en el acceso\.$/, "Order $1 - Valid for one person. Show this QR code at the entrance.", "Compra $1 - Válido para uma pessoa. Apresente este QR na entrada."],
    [/^Tus tickets para (.+)$/, "Your tickets for $1", "Seus ingressos para $1"],
    [/^¡Mirá este show en TicketShow! (.+)$/, "Check out this show on TicketShow! $1", "Veja este show no TicketShow! $1"]
  ];

  // Textos del cuerpo del e-mail y del PDF (se usan con T())
  const EXTRA = [
    ["Hola", "Hello", "Olá"],
    ["¡Gracias por tu compra en TicketShow!", "Thank you for your purchase on TicketShow!", "Obrigado pela sua compra no TicketShow!"],
    ["Show", "Show", "Show"], ["Entrada", "Ticket", "Ingresso"], ["Titular", "Holder", "Titular"],
    ["Códigos de tus tickets:", "Your ticket codes:", "Códigos dos seus ingressos:"],
    ["Abrí tus tickets con el código QR acá:", "Open your tickets with the QR code here:", "Abra seus ingressos com o código QR aqui:"],
    ["¡Disfrutá el show!", "Enjoy the show!", "Aproveite o show!"]
  ];
  DICT.push(...EXTRA);

  // Nombres de entradas y frases cortas que pueden aparecer dentro de otros textos
  const GLOSARIO = [
    ["Platea Baja", "Lower Seating", "Plateia Baixa"],
    ["Platea Alta", "Upper Seating", "Plateia Alta"],
    ["Campo General", "General Admission", "Pista Geral"],
    ["Entrada General", "General Admission", "Ingresso Geral"],
    ["Platea", "Seating", "Plateia"],
    ["Lugar a confirmar", "Venue to be announced", "Local a confirmar"],
    ["A confirmar", "To be announced", "A confirmar"]
  ];

  const FECHA = new RegExp(`(\\d{1,2}) de (${MESES.es.join("|")}) de (\\d{4})`, "g");
  const GLOSARIO_RE = new RegExp(`(^|[^\\p{L}])(${GLOSARIO.map((g) => g[0]).join("|")})(?![\\p{L}])`, "gu");

  const EXACTOS = { en: new Map(), pt: new Map() };
  const norm = (s) => s.replace(/\s+/g, " ").trim();
  DICT.forEach(([es, en, pt]) => { EXACTOS.en.set(norm(es), en); EXACTOS.pt.set(norm(es), pt); });

  /* ---------- Estado ---------- */
  let idioma = "es";
  try {
    const guardado = localStorage.getItem(CLAVE);
    if (IDIOMAS.some(([c]) => c === guardado)) idioma = guardado;
  } catch (_) { /* sin almacenamiento */ }

  /* ---------- Traducción de un texto ---------- */
  function traducir(texto, destino = idioma) {
    if (destino === "es" || typeof texto !== "string" || !texto) return texto;
    const inicio = texto.match(/^\s*/)[0];
    const fin = texto.match(/\s*$/)[0];
    const n = norm(texto);
    if (!n) return texto;

    const directo = EXACTOS[destino].get(n);
    if (directo !== undefined) return inicio + directo + fin;

    for (const [re, en, pt] of PATRONES) {
      const m = re.exec(n);
      if (m) {
        const plantilla = destino === "en" ? en : pt;
        return inicio + plantilla.replace(/\$(\d)/g, (_, i) => traducir(m[i], destino)) + fin;
      }
    }

    // Fechas largas y nombres de entradas dentro de un texto más largo
    const idx = destino === "en" ? 1 : 2;
    const sustituido = n
      .replace(FECHA, (_, d, mes, a) => {
        const nombreMes = MESES[destino][MESES.es.indexOf(mes)];
        return destino === "en" ? `${nombreMes} ${Number(d)}, ${a}` : `${Number(d)} de ${nombreMes} de ${a}`;
      })
      .replace(GLOSARIO_RE, (_, previo, termino) => previo + GLOSARIO.find((g) => g[0] === termino)[idx]);
    return sustituido === n ? texto : inicio + sustituido + fin;
  }

  /* ---------- Traducción del DOM ---------- */
  const ATRIBUTOS = ["placeholder", "alt", "title", "aria-label"];
  const textosOriginales = new WeakMap();   // nodo de texto -> español original
  const atributosOriginales = new WeakMap(); // elemento -> { atributo: español original }

  function nodoTexto(nodo) {
    const padre = nodo.parentElement;
    if (padre && (padre.tagName === "SCRIPT" || padre.tagName === "STYLE" || padre.closest("[translate=no]"))) return;
    if (!textosOriginales.has(nodo)) textosOriginales.set(nodo, nodo.data);
    const original = textosOriginales.get(nodo);
    const nuevo = idioma === "es" ? original : traducir(original);
    if (nodo.data !== nuevo) nodo.data = nuevo;
  }

  function atributosElemento(el) {
    if (el.closest("[translate=no]")) return;
    const guardados = atributosOriginales.get(el) || {};
    const aplicar = (nombre, leer, escribir) => {
      const actual = leer();
      if (actual == null || actual === "") return;
      if (!(nombre in guardados)) guardados[nombre] = actual;
      const nuevo = idioma === "es" ? guardados[nombre] : traducir(guardados[nombre]);
      if (actual !== nuevo) escribir(nuevo);
    };
    ATRIBUTOS.forEach((a) => aplicar(a, () => el.getAttribute(a), (v) => el.setAttribute(a, v)));
    if (el.tagName === "INPUT" && (el.type === "submit" || el.type === "button")) {
      aplicar("value", () => el.value, (v) => { el.value = v; });
    }
    atributosOriginales.set(el, guardados);
  }

  function traducirArbol(raiz) {
    if (raiz.nodeType === Node.TEXT_NODE) { nodoTexto(raiz); return; }
    if (raiz.nodeType !== Node.ELEMENT_NODE) return;
    atributosElemento(raiz);
    raiz.querySelectorAll("*").forEach(atributosElemento);
    const caminante = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT);
    const nodos = [];
    while (caminante.nextNode()) nodos.push(caminante.currentNode);
    nodos.forEach(nodoTexto);
  }

  function traducirTitulo() {
    const t = document.querySelector("title");
    if (t && t.firstChild) nodoTexto(t.firstChild);
  }

  function aplicar() {
    document.documentElement.lang = idioma;
    traducirTitulo();
    if (document.body) traducirArbol(document.body);
    document.querySelectorAll(".footer-idiomas [data-idioma]").forEach((b) => {
      const activo = b.dataset.idioma === idioma;
      b.classList.toggle("idioma--activo", activo);
      b.setAttribute("aria-pressed", String(activo));
    });
  }

  function cambiarIdioma(nuevo) {
    if (!IDIOMAS.some(([c]) => c === nuevo)) return;
    idioma = nuevo;
    try { localStorage.setItem(CLAVE, nuevo); } catch (_) { /* sin almacenamiento */ }
    aplicar();
  }

  /* ---------- Selector de idioma en el pie ---------- */
  function montarSelector() {
    const pie = document.querySelector("footer.footer-grande");
    if (!pie || pie.querySelector(".footer-idiomas")) return;
    const caja = document.createElement("div");
    caja.className = "footer-idiomas";
    caja.setAttribute("role", "group");
    caja.setAttribute("aria-label", "Idioma");
    caja.innerHTML = '<span class="idioma-globo" aria-hidden="true" translate="no">🌐</span>' +
      IDIOMAS.map(([c, nombre]) => `<button type="button" data-idioma="${c}" lang="${c}" translate="no">${nombre}</button>`).join("");
    caja.addEventListener("click", (e) => {
      const b = e.target.closest("[data-idioma]");
      if (b) cambiarIdioma(b.dataset.idioma);
    });
    const copy = pie.querySelector(".footer-copy");
    pie.insertBefore(caja, copy);
  }

  /* ---------- Inicio: traduce lo estático y lo que aparezca después ---------- */
  function iniciar() {
    montarSelector();
    aplicar();
    new MutationObserver((cambios) => {
      if (idioma === "es") return;
      cambios.forEach((c) => c.addedNodes.forEach(traducirArbol));
    }).observe(document.body, { childList: true, subtree: true });
    const titulo = document.querySelector("title");
    if (titulo) {
      new MutationObserver(() => { if (idioma !== "es") traducirTitulo(); }).observe(titulo, { childList: true });
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar);
  else iniciar();

  return { idioma: () => idioma, cambiar: cambiarIdioma, traducir, MESES };
})();

// Atajo para textos que no pasan por el DOM (PDF, e-mail, compartir)
const T = (texto) => TS_I18N.traducir(texto);
