# Utiliser une image officielle de Node.js comme base
FROM node:18

# Créer un répertoire de travail
WORKDIR /usr/src/app

# Copier les fichiers de l'application
COPY package*.json ./
COPY . .

# Installer les dépendances
RUN npm install

# Exposer le port que l'API utilise
EXPOSE 8080

# Lancer l'application
CMD [ "node", "server.js" ]

