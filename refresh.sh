#!/bin/bash

GREEN='\033[0;32m'
RED='\033[0;31m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m'

clear
echo -e "${CYAN}┏━━━━✿︎ Kazuma-Mr-Bot ✿︎━━━━╮${NC}"
echo -e "${CYAN}┃ ${NC}${YELLOW}✐ Iniciando Mantenimiento Total${NC}"
echo -e "${CYAN}┃ ${NC}${RED}✐ Preparando limpieza de datos...${NC}"
echo -e "${CYAN}╰━━━━━━━━━━━━━━━━━━━╯${NC}"
echo ""

if [ -d "sesion_bot" ]; then
    echo -e "${RED}[!] Eliminando sesión principal...${NC}"
    rm -rf sesion_bot
    sleep 1
else
    echo -e "${GREEN}[✓] Sesión principal limpia.${NC}"
fi

if [ -d "sesiones_subbots" ]; then
    echo -e "${RED}[!] Limpiando base de datos de Sub-Bots...${NC}"
    rm -rf sesiones_subbots
    sleep 1
fi

if [ -d "sesiones_moods" ]; then
    echo -e "${RED}[!] Limpiando base de datos de Mood-Bots...${NC}"
    rm -rf sesiones_moods
    sleep 1
fi

if [ -d "tmp" ]; then
    echo -e "${YELLOW}[!] Vaciando archivos temporales...${NC}"
    rm -rf tmp/*
fi

echo ""
echo -e "${GREEN}┏━━━━✿︎ LIMPIEZA FINALIZADA ✿︎━━━━╮${NC}"
echo -e "${GREEN}┃ ${NC}${CYAN}✐ Sistema optimizado.${NC}"
echo -e "${GREEN}┃ ${NC}${YELLOW}✐ Reiniciando para nueva vinculación...${NC}"
echo -e "${GREEN}╰━━━━━━━━━━━━━━━━━━━━━━━╯${NC}"
echo ""

npm start