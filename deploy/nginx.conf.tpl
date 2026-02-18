# Mission Control — Nginx configuration template
# Variables: DOMAIN, APP_PORT (default 3000), SSL_CERT, SSL_KEY
#
# Usage (envsubst):
#   export DOMAIN=mc.aionlylabs.online APP_PORT=3000 \
#          SSL_CERT=/etc/ssl/cloudflare/mc.aionlylabs.online.crt \
#          SSL_KEY=/etc/ssl/cloudflare/mc.aionlylabs.online.key
#   envsubst < deploy/nginx.conf.tpl > /etc/nginx/sites-enabled/mission-control
#   nginx -t && systemctl reload nginx

server {
    listen 80;
    server_name ${DOMAIN};
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name ${DOMAIN};

    ssl_certificate     ${SSL_CERT};
    ssl_certificate_key ${SSL_KEY};

    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache   shared:SSL:10m;
    ssl_session_timeout 10m;

    client_max_body_size 50M;

    # Health check — bypass auth, no access log
    # Proxies /_health → Next.js /api/health (underscore routes not served by Next.js)
    location = /_health {
        proxy_pass         http://127.0.0.1:${APP_PORT}/api/health;
        proxy_http_version 1.1;
        proxy_set_header   Host $host;
        access_log         off;
    }

    # Direct /api/health access (e.g. from docker-compose or internal checks)
    location = /api/health {
        proxy_pass         http://127.0.0.1:${APP_PORT};
        proxy_http_version 1.1;
        proxy_set_header   Host $host;
        access_log         off;
    }

    # SSE (Server-Sent Events) — disable buffering
    location /api/sse {
        proxy_pass         http://127.0.0.1:${APP_PORT};
        proxy_http_version 1.1;
        proxy_set_header   Connection '';
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_buffering    off;
        proxy_cache        off;
        proxy_read_timeout 600s;
    }

    # Everything else
    location / {
        proxy_pass          http://127.0.0.1:${APP_PORT};
        proxy_http_version  1.1;
        proxy_set_header    Upgrade $http_upgrade;
        proxy_set_header    Connection 'upgrade';
        proxy_set_header    Host $host;
        proxy_set_header    X-Real-IP $remote_addr;
        proxy_set_header    X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header    X-Forwarded-Proto $scheme;
        proxy_cache_bypass  $http_upgrade;
        proxy_read_timeout  60s;
    }

    # Grafana — WebSocket support for Live streaming
    location /grafana/ {
        proxy_pass          http://127.0.0.1:3001/grafana/;
        proxy_http_version  1.1;
        proxy_set_header    Upgrade $http_upgrade;
        proxy_set_header    Connection 'upgrade';
        proxy_set_header    Host $host;
        proxy_set_header    X-Real-IP $remote_addr;
        proxy_set_header    X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header    X-Forwarded-Proto $scheme;
        proxy_cache_bypass  $http_upgrade;
    }
}
