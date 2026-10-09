import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

export async function mockPublicSite(page) {await page.route('https://*.supabase.co/rest/v1/rpc/public_works',route=>route.fulfill({json:[]}));await page.route('https://*.supabase.co/rest/v1/cms_site?*',route=>route.fulfill({json:[{document:null,revision:0}]}));}

// Serve only the delivered document; all other HTTP resources are unavailable.
export async function standaloneOnly(page) {
  const external = [];
  await page.route(/^https?:/, route => {
    if(route.request().url().includes('.supabase.co/rest/v1/rpc/public_works'))return route.fulfill({json:[]});
    if(route.request().url().includes('.supabase.co/rest/v1/cms_site?'))return route.fulfill({json:[{document:null,revision:0}]});
    if (new URL(route.request().url()).pathname === '/' && route.request().resourceType() === 'document') {
      return route.fulfill({ status:200, contentType:'text/html; charset=utf-8', body:html });
    }
    external.push(route.request().url());
    return route.abort('blockedbyclient');
  });
  return external;
}
