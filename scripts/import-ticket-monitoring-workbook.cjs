const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const dotenv = require('dotenv');
const { Client } = require('pg');

dotenv.config({ path: '.env.local' });

const sourceName = 'BRANDCOM MONITORING 2026';
const workbookPath = path.resolve(__dirname, '../app/excel/BRANDCOM MONITORING 2026 (1).xlsx');
const dryRun = !process.argv.includes('--apply');

const slugify = (value) => String(value ?? '')
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '.')
  .replace(/^\.+|\.+$/g, '') || 'designer';

const getSlaDays = (materialName) => {
  const normalized = String(materialName ?? '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/_+$/, '');

  const map = {
    PROMO: 7,
    FLYERS: 15,
    STATIC_LAYOUT: 7,
    MOTION_GRAPHICS: 10,
    VIDEO_AVP: 15,
    DIGITAL_COLLATS: 7,
    VM_REQUESTS: 7,
    RADIO_SPOTIFY: 7,
  };

  return map[normalized] ?? 7;
};

const buildReferenceSets = (records) => {
  const departments = new Map();
  const designers = new Map();
  const materials = new Map();

  for (const record of records) {
    const departmentName = String(record.department ?? '').trim();
    if (departmentName) {
      const current = departments.get(departmentName) ?? 0;
      departments.set(departmentName, current + 1);
    }

    const designerName = String(record.designer ?? '').trim();
    if (designerName) {
      const current = designers.get(designerName) ?? { count: 0, department: departmentName || 'Unknown' };
      designers.set(designerName, {
        count: current.count + 1,
        department: current.department && current.department !== 'Unknown' ? current.department : (departmentName || 'Unknown'),
      });
    }

    const materialName = String(record.material ?? '').trim();
    if (materialName) {
      const current = materials.get(materialName) ?? 0;
      materials.set(materialName, current + 1);
    }
  }

  return {
    departments: [...departments.entries()].map(([name, count]) => ({ name, ticket_count: count })),
    designers: [...designers.entries()].map(([name, meta]) => ({
      name,
      department: meta.department || 'BrandCom',
      email: `${slugify(name)}@brandcom.local`,
      active_tickets: meta.count,
    })),
    materials: [...materials.entries()].map(([name, count]) => ({
      name,
      sla_days: getSlaDays(name),
      status: 'ACTIVE',
      ticket_count: count,
    })),
  };
};

const parser = String.raw`
import collections, datetime, json, re, sys, zipfile, xml.etree.ElementTree as ET

path = sys.argv[1]
ns = {'m': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main', 'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'}
status_map = {'PENDING': 'OPEN', 'WORKING': 'IN_PROGRESS', 'DONE': 'COMPLETED', 'CANCEL': 'CANCELLED', 'CANCELLED': 'CANCELLED'}
epoch = datetime.datetime(1899, 12, 30)

def as_date(value):
    value = (value or '').strip()
    if not value:
        return None
    try:
        return (epoch + datetime.timedelta(days=float(value))).date().isoformat()
    except ValueError:
        try:
            return datetime.date.fromisoformat(value[:10]).isoformat()
        except ValueError:
            return None

with zipfile.ZipFile(path) as book:
    shared_root = ET.fromstring(book.read('xl/sharedStrings.xml'))
    shared = [''.join(t.text or '' for t in item.findall('.//m:t', ns)) for item in shared_root.findall('m:si', ns)]
    workbook = ET.fromstring(book.read('xl/workbook.xml'))
    relationships = ET.fromstring(book.read('xl/_rels/workbook.xml.rels'))
    rels = {item.attrib['Id']: item.attrib['Target'] for item in relationships}
    sheet = next(item for item in workbook.findall('m:sheets/m:sheet', ns) if item.attrib['name'] == 'TICKET MONITORING 2026')
    target = rels[sheet.attrib['{' + ns['r'] + '}id']]
    target = target.lstrip('/') if target.startswith('/') else 'xl/' + target
    target = re.sub(r'xl/\.\./', '', target)
    records = []
    invalid_rows = []
    status_counts = collections.Counter()
    duplicate_numbers = collections.Counter()
    request_dates = []

    with book.open(target) as worksheet:
        for _, row in ET.iterparse(worksheet, events=('end',)):
            if not row.tag.endswith('}row'):
                continue
            row_number = int(row.attrib.get('r', '0'))
            if row_number >= 14:
                cells = {}
                for cell in row.findall('m:c', ns):
                    reference = cell.attrib.get('r', '')
                    column = re.match(r'[A-Z]+', reference)
                    if not column:
                        continue
                    value = cell.find('m:v', ns)
                    inline = cell.find('m:is', ns)
                    text = ''
                    if cell.attrib.get('t') == 's' and value is not None:
                        text = shared[int(value.text)]
                    elif inline is not None:
                        text = ''.join(item.text or '' for item in inline.findall('.//m:t', ns))
                    elif value is not None:
                        text = value.text or ''
                    cells[column.group(0)] = text.strip()

                ticket_number = cells.get('C', '')
                if ticket_number:
                    status_key = cells.get('P', '').strip().upper()
                    issues = []
                    if status_key not in status_map:
                        issues.append('status')
                    for column, field in [('H', 'ticket_request_date'), ('J', 'date_received_by_artist'), ('M', 'deadline')]:
                        if not as_date(cells.get(column)):
                            issues.append(field)
                    if issues:
                        invalid_rows.append({'row': row_number, 'fields': issues})
                    else:
                        try:
                            working_days = int(round(float(cells.get('L', '0') or 0)))
                        except ValueError:
                            working_days = 0
                        request_date = as_date(cells.get('H'))
                        received_date = as_date(cells.get('J'))
                        submission_date = as_date(cells.get('Q'))
                        elapsed = max(0, (datetime.date.today() - datetime.date.fromisoformat(received_date)).days)
                        record = {
                            'source_row': row_number,
                            'ticket_number': ticket_number,
                            'description': cells.get('D', ''),
                            'department': cells.get('E', ''),
                            'requestor': cells.get('F', ''),
                            'material': cells.get('I', ''),
                            'designer': cells.get('T', ''),
                            'ticket_request_date': request_date,
                            'date_received_by_artist': received_date,
                            'working_days': working_days,
                            'deadline': as_date(cells.get('M')),
                            'date_of_submission': submission_date,
                            'ticket_level': cells.get('U', '').strip().upper(),
                            'status': status_map[status_key],
                            'remarks': cells.get('V', ''),
                            'others': cells.get('W', ''),
                            'count': elapsed,
                        }
                        records.append(record)
                        duplicate_numbers[ticket_number] += 1
                        status_counts[record['status']] += 1
                        request_dates.append(request_date)
            row.clear()

print(json.dumps({
    'records': records,
    'invalidRows': invalid_rows,
    'statusCounts': dict(status_counts),
    'duplicateGroups': sum(1 for count in duplicate_numbers.values() if count > 1),
    'duplicateRows': sum(count - 1 for count in duplicate_numbers.values() if count > 1),
    'requestDateMin': min(request_dates) if request_dates else None,
    'requestDateMax': max(request_dates) if request_dates else None,
}))
`;

const importRows = JSON.parse(execFileSync('python3', ['-c', parser, workbookPath], {
  encoding: 'utf8',
  maxBuffer: 64 * 1024 * 1024,
}));

const main = async () => {
  if (!process.env.DIRECT_URL) throw new Error('DIRECT_URL is missing from .env.local');
  const client = new Client({ connectionString: process.env.DIRECT_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();

  try {
    if (!dryRun) {
      await client.query(fs.readFileSync(path.resolve(__dirname, '../supabase/ticket-monitoring-schema.sql'), 'utf8'));
      await client.query(fs.readFileSync(path.resolve(__dirname, '../supabase/activity-log-schema.sql'), 'utf8'));
    }

    const ticketNumbers = [...new Set(importRows.records.map((record) => record.ticket_number))];
    const sourceColumn = await client.query("select 1 from information_schema.columns where table_schema='public' and table_name='ticket-monitoring' and column_name='source_name'");
    const existing = sourceColumn.rowCount
      ? await client.query('select count(*)::int as count from public."ticket-monitoring" where ticket_number = any($1::text[]) and source_name is null', [ticketNumbers])
      : await client.query('select count(*)::int as count from public."ticket-monitoring" where ticket_number = any($1::text[])', [ticketNumbers]);
    const existingSourceCount = sourceColumn.rowCount
      ? (await client.query('select count(*)::int as count from public."ticket-monitoring" where source_name = $1', [sourceName])).rows[0].count
      : 0;
    const overlaps = existing.rows[0].count;

    console.log(`Workbook rows eligible: ${importRows.records.length}`);
    console.log(`Rows skipped for invalid required dates/status: ${importRows.invalidRows.length}`);
    console.log(`Repeated ticket-number groups preserved as distinct sheet rows: ${importRows.duplicateGroups}`);
    console.log(`Additional repeated-number rows preserved: ${importRows.duplicateRows}`);
    console.log(`Existing database rows sharing a source ticket number: ${overlaps}`);
    console.log(`Request date range: ${importRows.requestDateMin} to ${importRows.requestDateMax}`);
    console.log(`Status totals: ${JSON.stringify(importRows.statusCounts)}`);
    console.log(`Rows from this source already imported: ${existingSourceCount}`);

    if (importRows.invalidRows.length) {
      console.error(`Invalid row examples (row number and field names only): ${JSON.stringify(importRows.invalidRows.slice(0, 10))}`);
      throw new Error('Fix invalid dates or status values in the source workbook before import.');
    }

    if (dryRun) {
      console.log('Dry run only. Re-run with --apply to import these rows.');
      return;
    }

    await client.query('BEGIN');
    try {
      const columns = [
        'ticket_number', 'description', 'department', 'requestor', 'material', 'designer',
        'ticket_request_date', 'date_received_by_artist', 'working_days', 'deadline',
        'date_of_submission', 'ticket_level', 'status', 'remarks', 'others', 'count', 'source_name', 'source_row'
      ];
      const values = [];
      const placeholders = importRows.records.map((record, rowIndex) => {
        const rowValues = [
          record.ticket_number, record.description, record.department, record.requestor,
          record.material, record.designer, record.ticket_request_date, record.date_received_by_artist,
          record.working_days, record.deadline, record.date_of_submission, record.ticket_level,
          record.status, record.remarks, record.others, record.count, sourceName, record.source_row,
        ];
        const start = values.length;
        values.push(...rowValues);
        return `(${rowValues.map((_, index) => `$${start + index + 1}`).join(', ')})`;
      });
      const updateColumns = columns.filter((column) => !['source_name', 'source_row'].includes(column));
      const updates = updateColumns.map((column) => `${column} = EXCLUDED.${column}`).join(', ');
      await client.query(
        `insert into public."ticket-monitoring" (${columns.join(', ')}) values ${placeholders.join(', ')} on conflict (source_name, source_row) where source_name is not null and source_row is not null do update set ${updates}`,
        values
      );
      await client.query(
        `insert into public.ticket_activity_log (ticket_id, ticket_number, actor, action, details) values ($1, $2, $3, $4, $5)`,
        [`source:${sourceName}`, 'BULK IMPORT', 'Admin', 'Bulk Import', `Imported ${importRows.records.length} ticket rows from ${sourceName}.`]
      );
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }

    const referenceSets = buildReferenceSets(importRows.records);

    await client.query(
      `insert into public.departments (name, description, status, ticket_count)
       values ${referenceSets.departments.map((department, idx) => `($${idx * 4 + 1}, $${idx * 4 + 2}, $${idx * 4 + 3}, $${idx * 4 + 4})`).join(', ')}
       on conflict (name) do update set ticket_count = excluded.ticket_count, status = 'ACTIVE'`,
      referenceSets.departments.flatMap((department) => [department.name, `Ticket count for ${department.name}`, 'ACTIVE', department.ticket_count])
    );

    await client.query(
      `insert into public.materials (name, sla_days, status)
       values ${referenceSets.materials.map((material, idx) => `($${idx * 3 + 1}, $${idx * 3 + 2}, $${idx * 3 + 3})`).join(', ')}
       on conflict (name) do update set sla_days = excluded.sla_days, status = 'ACTIVE'`,
      referenceSets.materials.flatMap((material) => [material.name, material.sla_days, material.status])
    );

    await client.query(
      `insert into public.designers (name, department, email, active_tickets, status)
       values ${referenceSets.designers.map((designer, idx) => `($${idx * 5 + 1}, $${idx * 5 + 2}, $${idx * 5 + 3}, $${idx * 5 + 4}, $${idx * 5 + 5})`).join(', ')}
       on conflict (email) do update set name = excluded.name, department = excluded.department, active_tickets = excluded.active_tickets, status = 'ACTIVE'`,
      referenceSets.designers.flatMap((designer) => [designer.name, designer.department, designer.email, designer.active_tickets, 'ACTIVE'])
    );

    const finalCount = await client.query(
      'select count(*)::int as count from public."ticket-monitoring" where source_name = $1',
      [sourceName]
    );
    console.log(`Import complete. Current rows from this source: ${finalCount.rows[0].count}`);
    console.log(`Synced reference tables: departments=${referenceSets.departments.length}, designers=${referenceSets.designers.length}, materials=${referenceSets.materials.length}`);
  } finally {
    await client.end();
  }
};

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});