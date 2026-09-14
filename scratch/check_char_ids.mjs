import fs from 'fs';
import path from 'path';

const searchNames = ['라피 : 레드 후드', '아니스 : 스타', '크라운', '브리드 : 사일런트 트랙', '미하라 : 본딩 체인'];

function scanDir(dir) {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  for (const file of files) {
    const fullPath = path.join(dir, file.name);
    if (file.isDirectory()) {
      scanDir(fullPath);
    } else if (file.name.endsWith('.json')) {
      try {
        const content = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
        if (searchNames.includes(content.characterName)) {
          console.log({
            characterName: content.characterName,
            characterID: content.characterID,
            file: file.name
          });
        }
      } catch (e) { }
    }
  }
}

scanDir('/Users/alocados/Documents/Noah/Simc/src/character');
