# SassyCam 1.0

**Votre webcam, avec de la personnalité.** Un studio qui vous adore, vous taquine et transforme vos photos en portraits. Windows, macOS, Linux et ChatGPT Sites partagent la même interface.

Version majeure candidate, issue de la 0.1.2. La liste des vérifications réellement exécutées figure dans [le rapport de tests](docs/TEST_REPORT.md). Les fonctions qui dépendent d’un compte, d’un modèle ou d’un appareil ne sont pas présentées comme validées par un simple build.

## Le studio

- Caméra HD avec choix du périphérique, miroir, grille de cadrage et retardateur ; import JPEG/PNG/WebP.
- Curseur continu **−100 worship → 0 neutre → +100 roast**, avec préréglages.
- Répliques saisies au clavier ou dictées ; réponses vocales et commandes comme « Prends une photo », « Plus doux », « Portrait » et « Stop ».
- Séance automatique réglable, qui s’arrête quand le studio passe en arrière-plan.
- Portraits IA avec votre photo comme référence, et illustration locale gratuite clairement identifiée comme un effet photo sans IA générative.
- Galerie persistante, historique, aperçu plein format, export des originaux, cartes avec réplique et sauvegarde/restauration JSON.
- Thèmes clair/sombre, interface adaptée au mobile, raccourcis clavier et six langues de réponse.

La caméra et le micro sont ouverts à votre demande. Le studio envoie une photo au fournisseur choisi lors d’une action de génération ; il ne diffuse pas un flux webcam continu.

## Votre IA, votre compte

| Usage | Gratuit sur votre appareil | Avec votre propre compte |
|---|---|---|
| Conversation et vision | Ollama sur bureau ; SmolVLM dans le navigateur | ChatGPT personnel sur bureau, OpenAI API, Gemini, Claude, API compatible, Pollinations |
| Portraits | Illustration photo locale ; ComfyUI avec un modèle installé | OpenAI Images, Gemini Images, API images compatible sur bureau |
| Voix | Whisper local, voix du système ; Kokoro facultatif | Reconnaissance native du navigateur, selon sa disponibilité |

**Aucune clé ni aucun abonnement du créateur ne finance vos requêtes.** Les fournisseurs en ligne utilisent votre clé. Sur bureau, les clés peuvent être conservées dans le trousseau chiffré du système, avec séparation des profils. Sur le Site, elles restent en mémoire dans l’onglet et passent uniquement dans la requête vers le fournisseur choisi.

### Connexion ChatGPT : une distinction nécessaire

La connexion au **Site** identifie le visiteur ; elle n’accorde pas l’accès à son quota IA. L’intégration de quota d’une application hébergée demande une autorisation distincte d’OpenAI et n’est pas activée dans cette livraison.

Sur **bureau**, le parcours OAuth open source est implémenté pour les comptes éligibles : permission personnelle, PKCE, validation du jeton, renouvellement, choix des modèles du compte et Responses API en streaming. Il reste à vérifier avec une connexion personnelle réelle. Cette route accepte la vision mais exclut actuellement la génération d’images et l’audio ; ces moteurs restent indépendants.

Voir [la matrice de parité](docs/FEATURE_PARITY.md), [les prérequis pour le quota hébergé](docs/HOSTED_CHATGPT_PLAN.md) et [les limites officielles](https://developers.openai.com/siwc/token-sharing-open-source/preview-limitations).

## Démarrer sur bureau

Les paquets autonomes sont produits par le workflow [verify and package](.github/workflows/build.yml) : installateur et portable Windows, DMG/ZIP macOS, AppImage/DEB Linux, en x64 et ARM64. Les paquets de revue ne sont pas signés/notariés ; les protections habituelles du système s’appliquent. Un build macOS/Linux ne remplace pas un essai sur un appareil physique.

Depuis les sources, avec Node.js **22.13+** (Node 24 recommandé) :

```sh
git clone https://github.com/vhaloo/SassyCam.git
cd SassyCam
npm ci
npm run build
npm run desktop
```

Sur une branche de revue, récupérez cette branche avant `npm ci`. Les scripts `install_windows.bat` et `install_mac_linux.sh` exécutent les mêmes étapes. Aucun Python, Torch, FFmpeg ou modèle IA n’est chargé au démarrage du studio moderne.

L’option gratuite par défaut est l’IA du navigateur : cliquez sur **Activer l’IA gratuite** pour télécharger SmolVLM, sur bureau comme sur le Site. Ce petit modèle est surtout entraîné en anglais ; ses réponses en français et sa finesse sont limitées. Les performances varient selon l’appareil. Pour une IA locale plus puissante, installez une version actuelle d’[Ollama](https://ollama.com/download), un modèle de vision compatible, puis actualisez les modèles dans les réglages.

## Version web et hébergement ChatGPT

Le même studio est adapté au runtime Sites (Vinext/Cloudflare). L’identité vient des en-têtes Sites vérifiés côté serveur ; les appels en ligne exigent une identité et une origine autorisées. Le code source ne contient aucune clé partagée. Les URL de fournisseurs personnalisés et les intégrations de machine locale sont réservées au bureau.

Pour synchroniser un checkout Sites déjà préparé et enregistré :

```sh
node scripts/sync-site.mjs /chemin/absolu/du/checkout-sites
```

La commande conserve `.openai/hosting.json`, les identifiants du Site et les intégrations du starter. Elle ne publie pas le Site. Utilisez ensuite le workflow Sites de vérification, sauvegarde et déploiement. Les créations sont privées par défaut.

La galerie est conservée par compte **dans chaque navigateur**, sans synchronisation cloud. Exportez-la avant d’effacer les données du navigateur. La caméra requiert HTTPS et les permissions du navigateur ; ouvrez le Site dans un onglet autonome si un conteneur intégré bloque ces permissions.

## Préserver vos données 0.1.2

L’application d’origine et son historique sont conservés. `config.json`, les anciens profils du trousseau, les images de `~/nanobanana-output` et les modèles restent à leur emplacement d’origine. Le nouveau studio crée ses propres données ; les imports sont explicites.

```sh
# Dans un environnement Python séparé :
python -m pip install -r requirements-legacy.txt
python main.py --legacy
```

Whisper Python, Kokoro et ROS 2 restent disponibles comme modules facultatifs : [configuration locale](docs/LOCAL_AI.md).

## Développer et vérifier

```sh
npm run dev       # UI 127.0.0.1:4173 + API locale :4174
npm run check
npm test
npm run build
npm run dist      # paquets pour le système courant
```

Les tests couvrent les contrats fournisseurs, l’isolation des comptes, les origines, les limites d’entrée, le coffre chiffré, OAuth et les flux interrompus. Le scénario Electron utilise une caméra et des images synthétiques ; il peut vérifier une vraie inférence du modèle local sans capturer une personne.

Le serveur local reste lié à `127.0.0.1` et conserve son port entre redémarrages pour préserver l’origine de la galerie. Une adresse personnalisée distante doit utiliser HTTPS. Aucun endpoint ChatGPT non documenté, cookie de session extrait ou jeton Codex n’est utilisé.

[MIT](LICENSE) · [Historique 0.x](docs/CHANGELOG-0.x.md) · [Plan de réalisation](docs/IMPLEMENTATION_PLAN.md)
