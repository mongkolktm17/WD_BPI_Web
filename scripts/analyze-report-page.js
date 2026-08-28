const fs = require('fs');
const html = fs.readFileSync('C:\\xampp\\htdocs\\wdbpi\\scripts\\report_page_original.html', 'utf8');

const sections = [];

// Find all form elements
const forms = html.match(/<form[^>]*>/gi) || [];
sections.push('=== FORMS ===');
forms.forEach(f => sections.push(f));

// Find buttons
const buttons = html.match(/<button[^>]*>[\s\S]*?<\/button>/gi) || [];
sections.push('\n=== BUTTONS ===');
buttons.forEach(b => {
  const text = b.replace(/<[^>]*>/g, '').trim().substring(0, 100);
  const onclick = b.match(/onclick=['"]([^'"]+)['"]/);
  sections.push(`  "${text}" ${onclick ? 'onclick=' + onclick[1] : ''}`);
});

// Find links
sections.push('\n=== LINKS ===');
const linkRegex = /<a[^>]*href=['"]([^'"]+)['"][^>]*>([\s\S]*?)<\/a>/gi;
let match;
while ((match = linkRegex.exec(html)) !== null) {
  const text = match[2].replace(/<[^>]*>/g, '').trim().substring(0, 60);
  if (text) sections.push(`  ${match[1]} => "${text}"`);
}

// Find JS functions
const jsFuncs = html.match(/function\s+\w+/g) || [];
sections.push('\n=== JS FUNCTIONS ===');
jsFuncs.forEach(f => sections.push(`  ${f}`));

// Find AJAX calls
const ajax = html.match(/\$\.(get|post|ajax)\s*\(\s*['"][^'"]+['"]/g) || [];
sections.push('\n=== AJAX CALLS ===');
ajax.forEach(a => sections.push(`  ${a}`));

// Find fetch calls
const fetchCalls = html.match(/fetch\s*\(\s*['"][^'"]+['"]/g) || [];
sections.push('\n=== FETCH CALLS ===');
fetchCalls.forEach(f => sections.push(`  ${f}`));

// Find select options
const selects = html.match(/<select[^>]*name=['"]([^'"]+)['"]/gi) || [];
sections.push('\n=== SELECT ELEMENTS ===');
selects.forEach(s => sections.push(`  ${s}`));

// Find table headers
const ths = html.match(/<th[^>]*>([\s\S]*?)<\/th>/gi) || [];
sections.push('\n=== TABLE HEADERS ===');
ths.forEach(t => {
  const text = t.replace(/<[^>]*>/g, '').trim();
  if (text) sections.push(`  ${text}`);
});

// Find tabs / navigation
const tabs = html.match(/tab[_-]?[a-z]+/gi) || [];
sections.push('\n=== TABS ===');
[...new Set(tabs)].forEach(t => sections.push(`  ${t}`));

// Find report type filters
const filters = html.match(/report[_-]?type|filter|category/gi) || [];
sections.push('\n=== FILTER KEYWORDS ===');
[...new Set(filters)].forEach(f => sections.push(`  ${f}`));

console.log(sections.join('\n'));
