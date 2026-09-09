@echo off
REM ===================================================================
REM  enviar.bat - grava e envia o trabalho para o GitHub
REM ===================================================================
REM  Uso:   enviar "mensagem do commit"
REM         enviar                    (usa uma mensagem com a data)
REM
REM  Faz, por esta ordem:
REM    1. mostra o que mudou
REM    2. grava tudo (add + commit)
REM    3. traz o que o Joao pos la (pull)
REM    4. envia (push)
REM
REM  O pull vem DEPOIS do commit de proposito: o merge junta duas
REM  historias completas em vez de misturar trabalho por gravar com
REM  trabalho que vem de fora.
REM
REM  Se houver conflito, PARA e diz. Nunca envia nada por resolver.
REM ===================================================================

setlocal
cd /d "%~dp0"

set "MENSAGEM=%~1"
if "%MENSAGEM%"=="" set "MENSAGEM=Trabalho de %DATE%"

echo.
echo === O que mudou ===================================================
git status --short
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
