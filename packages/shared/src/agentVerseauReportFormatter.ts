import { formatHtmlAsPlainText, repairUtf8Mojibake } from './textFormatter';

export function formatAgentVerseauReport(report: string): string {
  return formatHtmlAsPlainText(repairUtf8Mojibake(report));
}
