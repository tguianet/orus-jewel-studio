Plano: unificar ícones PWA na marca Amada Amante

Objetivo
--------
Trocar os ícones e nomes dos PWAs de Admin e Sacoleira para a marca Amada Amante, mantendo a Loja inalterada.

Escopo técnico
--------------
1. Gerar novos ícones PWA para Admin e Sacoleira a partir do logo Amada Amante (coração com asas), com fundo rosa sólido da marca (#C1186E) para garantir instalabilidade.
   - /icons/admin-192.png
   - /icons/admin-512.png
   - /icons/admin-maskable-512.png
   - /icons/sacoleira-192.png
   - /icons/sacoleira-512.png
   - /icons/sacoleira-maskable-512.png

2. Atualizar os nomes e descrições dos apps:
   - Admin: "Amada Amante Admin" (short name "Admin")
   - Sacoleira: "Amada Amante Sacoleira" (short name "Sacoleira")
   - Descrições também ajustadas para a marca Amada Amante.

3. Sincronizar versão de cache PWA em todos os arquivos para forçar a troca nos dispositivos que já instalaram os apps antigos:
   - src/pwa/manifestConfig.ts
   - index.html
   - public/manifests/manifest-admin.json
   - public/manifests/manifest-sacoleira.json
   - vite.config.ts (PWA_CACHE_VERSION)

4. Não alterar os ícones/nome da Loja (já estão corretos).

5. Verificar build para garantir que não há erros.

Resultado esperado
------------------
- Ao acessar /login-admin, /login-sacoleira ou /loja, cada rota apresenta ícones e nome da marca Amada Amante.
- O botão "Adicionar à tela inicial" / "Instalar app" aparece novamente nos dispositivos Android e o ícone de instalação fica correto no iOS.

