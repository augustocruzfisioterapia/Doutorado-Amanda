// =============================================
// SERVICE WORKER - Doutorado Amanda
// Versão: 1.0.0
// =============================================

const CACHE_NAME = 'doutorado-amanda-v1.0.0';
const BASE_PATH = '/Doutorado-Amanda';

// Assets para cache inicial (instalação)
const ASSETS_TO_CACHE = [
    `${BASE_PATH}/`,
    `${BASE_PATH}/index.html`,
    `${BASE_PATH}/manifest.json`,
    `${BASE_PATH}/icons/icon-72x72.png`,
    `${BASE_PATH}/icons/icon-96x96.png`,
    `${BASE_PATH}/icons/icon-128x128.png`,
    `${BASE_PATH}/icons/icon-144x144.png`,
    `${BASE_PATH}/icons/icon-152x152.png`,
    `${BASE_PATH}/icons/icon-192x192.png`,
    `${BASE_PATH}/icons/icon-384x384.png`,
    `${BASE_PATH}/icons/icon-512x512.png`
];

// =============================================
// EVENTO: INSTALAÇÃO
// =============================================
self.addEventListener('install', (event) => {
    console.log('🔧 Service Worker: Instalando...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('📦 Cache aberto, adicionando assets...');
                return cache.addAll(ASSETS_TO_CACHE)
                    .then(() => {
                        console.log('✅ Todos os assets foram cacheados com sucesso!');
                    })
                    .catch((error) => {
                        console.error('❌ Erro ao cachear assets:', error);
                        // Continua mesmo se algum asset falhar
                    });
            })
            .then(() => {
                console.log('🚀 Service Worker instalado, pulando para ativação...');
                return self.skipWaiting();
            })
    );
});

// =============================================
// EVENTO: ATIVAÇÃO
// =============================================
self.addEventListener('activate', (event) => {
    console.log('🔧 Service Worker: Ativando...');
    
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((name) => {
                            // Remove caches antigos (versões diferentes)
                            return name !== CACHE_NAME;
                        })
                        .map((name) => {
                            console.log('🗑️ Removendo cache antigo:', name);
                            return caches.delete(name);
                        })
                );
            })
            .then(() => {
                console.log('✅ Service Worker ativado e caches limpos!');
                // Assume controle de todas as páginas imediatamente
                return self.clients.claim();
            })
    );
});

// =============================================
// EVENTO: FETCH (Interceptação de Requisições)
// Estratégia: Network First com fallback para Cache
// =============================================
self.addEventListener('fetch', (event) => {
    // Ignora requisições que não sejam do nosso domínio
    const url = new URL(event.request.url);
    if (!url.origin.includes(self.location.origin)) {
        return;
    }
    
    // Ignora requisições que não sejam GET
    if (event.request.method !== 'GET') {
        return;
    }
    
    // Ignora requisições para APIs externas (SheetJS CDN)
    if (url.hostname.includes('cdn.sheetjs.com') || 
        url.hostname.includes('cdnjs.cloudflare.com') ||
        url.hostname.includes('scontent-gru1') ||
        url.hostname.includes('fbcdn.net') ||
        url.hostname.includes('encrypted-tbn0')) {
        // Tenta buscar da rede, se falhar retorna erro
        event.respondWith(
            fetch(event.request).catch(() => {
                return new Response('Recurso externo indisponível offline.', {
                    status: 503,
                    statusText: 'Service Unavailable'
                });
            })
        );
        return;
    }
    
    // Estratégia: Network First (tenta rede primeiro, fallback para cache)
    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // Clone da resposta para armazenar no cache
                const responseClone = response.clone();
                
                // Se a resposta for OK, atualiza o cache
                if (response.status === 200) {
                    caches.open(CACHE_NAME)
                        .then((cache) => {
                            cache.put(event.request, responseClone);
                        })
                        .catch((error) => {
                            console.warn('⚠️ Erro ao atualizar cache:', error);
                        });
                }
                
                return response;
            })
            .catch(() => {
                // Se offline, tenta buscar do cache
                console.log('📡 Offline detectado, buscando do cache:', event.request.url);
                
                return caches.match(event.request)
                    .then((cachedResponse) => {
                        if (cachedResponse) {
                            console.log('✅ Encontrado no cache:', event.request.url);
                            return cachedResponse;
                        }
                        
                        // Se for uma navegação (página HTML), retorna index.html
                        if (event.request.mode === 'navigate') {
                            console.log('🔄 Navegação offline, retornando index.html do cache');
                            return caches.match(`${BASE_PATH}/index.html`);
                        }
                        
                        // Se não encontrou nada
                        console.log('❌ Recurso não encontrado em cache:', event.request.url);
                        return new Response('Conteúdo não disponível offline.', {
                            status: 503,
                            statusText: 'Service Unavailable',
                            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
                        });
                    });
            })
    );
});

// =============================================
// EVENTO: MENSAGENS (Comunicação com a página)
// =============================================
self.addEventListener('message', (event) => {
    console.log('📨 Mensagem recebida:', event.data);
    
    if (event.data === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data === 'CLEAR_CACHE') {
        caches.delete(CACHE_NAME)
            .then(() => {
                console.log('🗑️ Cache limpo por solicitação da página');
            });
    }
    
    if (event.data === 'CHECK_UPDATE') {
        self.registration.update()
            .then(() => {
                console.log('🔄 Verificando atualizações...');
            });
    }
});

console.log('👩‍🎓 Service Worker do Doutorado Amanda carregado e pronto! 💜');
