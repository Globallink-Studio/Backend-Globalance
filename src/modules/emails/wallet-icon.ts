export const WALLET_BADGE_CONTENT_ID = "wallet-badge";

export const WALLET_BADGE_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAACwAAAAsCAYAAAAehFoBAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAJWSURBVFhH7ZghbxwxEIUDAwPLfJlJpKrKeAsLA/MTCgMDC0MqheUnBB6JVBipJLRSQWGkkoLCgsDAU5QoreZ8Pu2+8fqc9OyQe9IDt/ba39lj79hbWxtt9HI5d/CWSI6Z5Wyd1jb39uQD9vdiaWNEcsPs/1b2LbM/wv6fJebukNnPEo1XM5H/iBzFajSy6Jlz794gy0rt73fvsTEi/4dZvq3X/ieRvx/2I8fIs1JEB58RuJ3lDHmyWuwGTWN3aPmOTKMi8ie2gdewXCCbkXPdZHxXkAcbf/9vIvnN7B9sf+ruEBkHIvJX8NKTbaSddZdCxqWcc9s4uru78gUbaeDH/m/drZB1rsQ2dqvPmeU80WgtTycT+dp/pmsKWecikk9Q8SqWaR6BOcC6HfMJO0AjW1x4saBiZRVzFFesrGKO4oqVVcxRXLGyijmKK1YQHA40IVrN8RrAhYeDS3xvrtbAzzkcJJP61sAFI9u3TepbAie+qjqKP9IxHMshqW8JbL+qch3LLMcIj61YDzjXly2zdUYqboCXIvKnADSNZZZjhMdWrAesFybQ113oP7fo/Ck00g7YuW6ndA+ONol8S2BVIixyXobMUq2BVTZZT/pGj2/4buof239VQYnTTGnyM1wI2RNrRTEPD75msUUtFsJgOkygV9aCQa9dexyZu4nwPR+Oskk6KklhE/cis2T8RmFYBOse6acQZ+v2hR3ZTDj0FeAQur3D7GZGNypMjVxjA439S+/5kC2rcMay01TZMw2DopFNKdy36VHGxFwF+yOdXWTYqKX+AZXDk4DRfrihAAAAAElFTkSuQmCC";

export const WALLET_BADGE_DATA_URI = `data:image/png;base64,${WALLET_BADGE_PNG_BASE64}`;

export function walletBadgeImgTag(width = 22, height = 22): string {
  return `<img src="cid:${WALLET_BADGE_CONTENT_ID}" width="${width}" height="${height}" alt="" border="0" style="display: block; border: 0; outline: none;">`;
}
