@echo off
REM ===================================================================
REM  enviar.bat - grava e envia o trabalho para o GitHub
REM ===================================================================
REM  Uso:   enviar "mensagem do commit"
REM         enviar                    (usa uma mensagem com a data)
REM
REM  Faz, por esta ordem:
REM    1. mostra o que mudou
REM    2. PARA e obriga a olhar para a lista
REM    3. recusa se houver ficheiros que nunca devem ir para o GitHub
REM    4. grava (add + commit)
REM    5. traz o que o Joao pos la (pull)
REM    6. envia (push)
REM
REM  O pull vem DEPOIS do commit de proposito: o merge junta duas
REM  historias completas em vez de misturar trabalho por gravar com
REM  trabalho que vem de fora.
REM
REM  Se houver conflito, PARA e diz. Nunca envia nada por resolver.
REM
REM  ---------------------------------------------------------------
REM  PORQUE E QUE HA UMA PAUSA E UMA VERIFICACAO (09/09, ideia do Joao)
REM  ---------------------------------------------------------------
REM  O `git add -A` manda TUDO o que nao esteja no .gitignore. Foi assim
REM  que o .env foi parar ao GitHub e obrigou a reescrever a historia
REM  toda do repositorio.
REM
REM  A primeira versao deste ficheiro mostrava a lista e gravava a
REM  seguir, sem parar. Mostrar uma lista que ninguem e obrigado a ler
REM  nao e uma protecao - e um registo do erro depois de ele acontecer.
REM  Dai a pausa.
REM
REM  Mas uma pausa depende de alguem estar atento as onze da noite, e
REM  ninguem esta. Por isso ha tambem uma verificacao que nao depende
REM  de atencao nenhuma: se aparecer um .env ou uma chave privada na
REM  lista, isto RECUSA gravar. As duas coisas juntas, porque nenhuma
REM  chega sozinha.
REM ===================================================================

setlocal enabledelayedexpansion
cd /d "%~dp0"

set "MENSAGEM=%~1"
if "%MENSAGEM%"=="" set "MENSAGEM=Trabalho de %DATE%"

echo.
echo ===================================================================
echo  O QUE VAI SER GRAVADO
echo ===================================================================
git status --short
echo ===================================================================
echo.

REM --- ha alguma coisa para gravar? ---------------------------------
git diff --quiet --exit-code
set ALTERADO=%ERRORLEVEL%
git diff --cached --quiet --exit-code
set EM_STAGE=%ERRORLEVEL%
for /f %%N in ('git ls-files --others --exclude-standard ^| find /c /v ""') do set NOVOS=%%N

if "%ALTERADO%"=="0" if "%EM_STAGE%"=="0" if "%NOVOS%"=="0" (
  echo Nada de novo para gravar. Vou so tentar enviar o que ja estava.
  goto :puxar
)

REM --- 3. Ficheiros que nunca devem ir para o GitHub ----------------
REM  O .env.example e o backend/certs/ca.pem SAO para ir, e estao
REM  excluidos desta verificacao de proposito - um alarme que toca sem
REM  motivo deixa de ser lido a segunda vez.
set PERIGO=0
for /f "delims=" %%F in ('git status --porcelain ^| findstr /R /C:"\.env$" /C:"\.env\." /C:"id_rsa" /C:"id_ed25519" /C:"\.pfx$" /C:"\.p12$" /C:"\.keystore$"') do (
  echo %%F | findstr /C:".env.example" >nul || (
    echo  [!] PERIGO: %%F
    set PERIGO=1
  )
)

if "!PERIGO!"=="1" (
  echo.
  echo ===================================================================
  echo  NAO GRAVEI NADA.
  echo.
  echo  Ha ficheiros na lista que nao devem ir para o GitHub - ficheiros
  echo  de ambiente ou chaves privadas. Foi assim que o .env foi parar la
  echo  em Setembro e obrigou a reescrever a historia do repositorio.
  echo.
  echo  Se estiverem mesmo a ser seguidos pelo git, o .gitignore nao os
  echo  esta a apanhar. Trata disso primeiro.
  echo ===================================================================
  goto :fim
)

REM --- 2. A pausa ---------------------------------------------------
echo Olha para a lista acima antes de continuar.
echo Se estiver la alguma coisa que nao devia ir, fecha esta janela agora.
echo.
pause

echo.
echo === A gravar ======================================================
git add -A
git commit -m "%MENSAGEM%"
if errorlevel 1 (
  echo.
  echo [!] O commit falhou. Nada foi enviado.
  goto :fim
)

:puxar
echo.
echo === A trazer o que esta no GitHub =================================
git pull --no-rebase --no-edit
if errorlevel 1 (
  echo.
  echo [!] CONFLITO ou erro no pull. NAO enviei nada.
  echo     Copia o texto acima para o chat, para resolvermos.
  echo     Ficheiros por resolver:
  git diff --name-only --diff-filter=U
  goto :fim
)

echo.
echo === A enviar ======================================================
git push
if errorlevel 1 (
  echo.
  echo [!] O push falhou. Se disser que o remoto tem trabalho novo,
  echo     e porque o Joao fez push enquanto isto corria: volta a
  echo     correr o enviar.bat. Se disser outra coisa, copia para o chat.
  goto :fim
)

echo.
echo === Feito =========================================================
git status --short --branch
echo.
echo Se a linha acima disser "## main...origin/main" sem mais nada,
echo esta tudo la em cima.

:fim
echo.
pause
endlocal
