# visor-rt-rod-amb

Aquest treball s'emmarca en l'activitat del Centre de Gestió d'Informació de Mobilitat (CGIM) de l'Autoritat del Transport Metropolità, i té per objectiu el disseny i la implementació d'un visor web per representar les alteracions del servei de transport públic en temps real, centrat en l’operador Rodalies de Catalunya i el servei de busos de l’entitat supramunicipal Àrea Metropolitana de Barcelona (AMB). El visor concebut com una eina interna de suport en l'àmbit de la gestió, permet visualitzar sobre mapa les alteracions actives a través de l'especificació General Transit Feed Specification Realtime (GTFS RT). 

Entre algunes de les funcionalitats implementades destaquen els filtres dinàmics, les eines de cerca i el suport multilingüe mitjançant la llibreria de MapLibre GL JS. 

Per complementar el visor s’ha elaborat un índex de criticitat generat amb FME, una eina ETL especialitzada en la transformació i integració de dades. El desenvolupament del projecte ha requerit la implementació de processos de tractament i enriquiment de dades, incloent-hi la integració d'informació procedent de GTFS estàtic, per tal d’identificar-ne els elements afectats i incorporar-ne la respectiva representació geogràfica. El resultat obtingut és un eina funcional i intuïtiva destinada a consultar i monitoritzar les incidències del transport públic, facilitant tasques de seguiment i d’anàlisi desenvolupades en el CGIM.

1. Configuració inicial del servidor

S’han utilitzat les següents dependències principals:
• Flask: per a la construcció de l’API REST.
• Flask-CORS: per habilitar la comunicació entre el frontend i el backend.
• Requests: per realitzar peticions HTTP a serveis externs.
• Csv: per al processament de fitxers GTFS.
• Re: per al tractament mitjançant expressions regu-lars.
• Ftfy: per a la correcció automàtica de problemes de codificació textual.
• Os: per a la gestió de rutes i fitxers del sistema.

La inicialització del servidor es realitza mitjançant la crea-ció d’una instància de Flask i l’activació del sistema CORS, fet imprescindible durant la fase de desenvolupament per permetre l’accés al backend des de dominis o ports diferents.
