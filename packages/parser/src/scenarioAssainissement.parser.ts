import sax = require('sax');
import { SandreTags } from './sandreConstants';
import {
  Analyse,
  Emetteur,
  FctAssainissement,
  OuvrageDepollution,
  PointMesure,
  Prelevement,
  Scenario,
  SystemeCollecte,
} from './scenarioAssainissement';

export function parseScenarioAssainissementXml(xmlInput: string): Promise<FctAssainissement> {
  return new Promise((resolve, reject) => {
    const parser = sax.parser(true, {
      trim: true,
      normalize: true,
      xmlns: true,
    });

    const result: FctAssainissement = {
      scenario: {} as Scenario,
      ouvrages: [],
      systemesCollecte: [],
    };

    let stack: any[] = [];
    // Root context
    let root: any = {};
    stack.push(root);

    parser.onopentag = (node: sax.QualifiedTag) => {
      const tagName = node.local;
      const newObj: any = {};

      const parent = stack[stack.length - 1];

      if (Array.isArray(parent)) {
        parent.push(newObj);
      } else {
        if (parent[tagName]) {
          if (!Array.isArray(parent[tagName])) {
            parent[tagName] = [parent[tagName]];
          }
          parent[tagName].push(newObj);
        } else {
          parent[tagName] = newObj;
        }
      }

      Object.defineProperty(newObj, '_name', {
        value: tagName,
        enumerable: false,
      });

      stack.push(newObj);
    };

    parser.ontext = (text) => {
      const current = stack[stack.length - 1];
      if (current) {
        if (!current._text) current._text = '';
        current._text += text;
      }
    };

    parser.onclosetag = (tagName) => {
      const current = stack.pop();
      const name = current._name;

      // Simplify object if it only has text
      let finalValue = current;
      const keys = Object.keys(current);
      if (current._text && (keys.length === 0 || (keys.length === 1 && keys[0] === '_text'))) {
        finalValue = current._text;
      }

      // Update the parent reference to this new simplified value
      const parent = stack[stack.length - 1];

      if (finalValue !== current) {
        // We need to swap it in the parent
        if (Array.isArray(parent[name])) {
          const arr = parent[name];
          arr[arr.length - 1] = finalValue;
        } else {
          parent[name] = finalValue;
        }
      }

      // Check if this was one of our target objects
      if (name === SandreTags.Scenario) {
        result.scenario = mapScenario(finalValue);
        delete parent[name];
      } else if (name === SandreTags.OuvrageDepollution) {
        result.ouvrages.push(mapOuvrage(finalValue));
        if (Array.isArray(parent[name])) {
          const arr = parent[name];
          arr.pop();
        } else {
          delete parent[name];
        }
      } else if (name === SandreTags.SystemeCollecte) {
        result.systemesCollecte.push(mapSystemeCollecte(finalValue));
        if (Array.isArray(parent[name])) {
          const arr = parent[name];
          arr.pop();
        } else {
          delete parent[name];
        }
      }
    };

    parser.onerror = (err) => {
      reject(err);
    };

    parser.onend = () => {
      resolve(result);
    };

    parser.write(xmlInput).close();
  });
}

export function addNameTagToXml(xml: string, nomContact: string): string {
  const hasNomContactInEmetteur = /<Emetteur>[\s\S]*?<NomContact>[\s\S]*?<\/NomContact>[\s\S]*?<\/Emetteur>/.test(xml);

  if (hasNomContactInEmetteur) {
    return xml;
  }

  const hasEmetteur = /<Emetteur>[\s\S]*?<\/Emetteur>/.test(xml);

  if (!hasEmetteur) {
    const hasDestinataire = /<Destinataire>/.test(xml);

    if (hasDestinataire) {
      return xml.replace(/(\s*)(<Destinataire>)/, (match, p1, p2) => {
        const indent = p1.replace(/\n/, '') || '';
        const contactIndent = indent + '  ';
        const nomContactIndent = contactIndent + '  ';
        return `${p1}<Emetteur>\n${contactIndent}<Contact>\n${nomContactIndent}<NomContact>${nomContact}</NomContact>\n${contactIndent}</Contact>\n${indent}</Emetteur>${p1}${p2}`;
      });
    } else {
      return xml.replace(/(<Scenario>)(\s*)([\s\S]*?)(<\/Scenario>)/, (match, p1, p2, p3, p4) => {
        const scenarioIndent = p2.replace(/\n/, '') || '';
        const emetteurIndent = scenarioIndent + '  ';
        const contactIndent = emetteurIndent + '  ';
        const nomContactIndent = contactIndent + '  ';
        return `${p1}\n${emetteurIndent}<Emetteur>\n${contactIndent}<Contact>\n${nomContactIndent}<NomContact>${nomContact}</NomContact>\n${contactIndent}</Contact>\n${emetteurIndent}</Emetteur>${p3}\n${scenarioIndent}${p4}`;
      });
    }
  }

  const hasContact = /<Emetteur>[\s\S]*?<Contact>[\s\S]*?<\/Contact>[\s\S]*?<\/Emetteur>/.test(xml);

  if (hasContact) {
    return xml.replace(/(<Emetteur>[\s\S]*?<Contact>)([\s\S]*?)(\s*)(<\/Contact>)/, (match, p1, p2, p3, p4) => {
      const closingIndent = p3.replace(/\n/, '') || '';
      const childIndent = closingIndent + '  ';
      return `${p1}${p2}\n${childIndent}<NomContact>${nomContact}</NomContact>${p3}${p4}`;
    });
  }

  return xml.replace(/(<Emetteur>)([\s\S]*?)(\s*)(<\/Emetteur>)/, (match, p1, p2, p3, p4) => {
    const emetteurIndent = p3.replace(/\n/, '') || '';
    const contactIndent = emetteurIndent + '  ';
    const nomContactIndent = contactIndent + '  ';
    return `${p1}${p2}\n${contactIndent}<Contact>\n${nomContactIndent}<NomContact>${nomContact}</NomContact>\n${contactIndent}</Contact>${p3}${p4}`;
  });
}

function mapScenario(raw: any): Scenario {
  return {
    codeScenario: raw[SandreTags.CodeScenario],
    versionScenario: raw[SandreTags.VersionScenario],
    emetteur: mapEmetteur(raw[SandreTags.Emetteur]),
  };
}

function mapEmetteur(raw: any): Emetteur {
  return {
    cdIntervenant: raw[SandreTags.CdIntervenant],
    nomIntervenant: raw[SandreTags.NomIntervenant],
  };
}

function mapOuvrage(raw: any): OuvrageDepollution {
  return {
    cdOuvrageDepollution: raw[SandreTags.CdOuvrageDepollution],
    typeOuvrageDepollution: raw[SandreTags.TypeOuvrageDepollution],
    nomOuvrageDepollution: raw[SandreTags.NomOuvrageDepollution],
    pointMesure: mapPointMesureList(raw[SandreTags.PointMesure]),
  };
}

function mapSystemeCollecte(raw: any): SystemeCollecte {
  return {
    cdSystemeCollecte: raw[SandreTags.CdSystemeCollecte],
    lbSystemeCollecte: raw[SandreTags.LbSystemeCollecte],
    pointMesure: mapPointMesureList(raw[SandreTags.PointMesure]),
  };
}

function mapPointMesureList(raw: any): PointMesure[] {
  if (!raw) return [];
  const list = Array.isArray(raw) ? raw : [raw];
  return list.map(mapPointMesure);
}

function mapPointMesure(raw: any): PointMesure {
  return {
    numeroPointMesure: raw[SandreTags.NumeroPointMesure],
    prelevement: mapPrelevementList(raw[SandreTags.Prlvt]),
  };
}

function mapPrelevementList(raw: any): Prelevement[] {
  if (!raw) return [];
  const list = Array.isArray(raw) ? raw : [raw];
  return list.map(mapPrelevement);
}

function mapPrelevement(raw: any): Prelevement {
  return {
    analyse: mapAnalyseList(raw[SandreTags.Analyse]),
  };
}

function mapAnalyseList(raw: any): Analyse[] {
  if (!raw) return [];
  const list = Array.isArray(raw) ? raw : [raw];
  return list.map(mapAnalyse);
}

function mapAnalyse(raw: any): Analyse {
  return {
    rsAnalyse: raw[SandreTags.RsAnalyse],
  };
}
