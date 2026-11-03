const test = require('node:test');
const assert = require('node:assert/strict');
const { toCsv } = require('./export-data.js');

test('toCsv converts arrays of objects to a CSV string', () => {
  const rows = [
    { ticketNumber: 'T-100', department: 'Marketing', status: 'OPEN' },
    { ticketNumber: 'T-101', department: 'Design', status: 'IN_PROGRESS' },
  ];

  const csv = toCsv(rows);

  assert.equal(csv, [
    'ticketNumber,department,status',
    'T-100,Marketing,OPEN',
    'T-101,Design,IN_PROGRESS',
  ].join('\n'));
});

test('toCsv escapes values with commas and quotes', () => {
  const rows = [{ description: 'Needs "urgent" review, approval', status: 'OPEN' }];

  const csv = toCsv(rows);

  assert.equal(csv, [
    'description,status',
    '"Needs ""urgent"" review, approval",OPEN',
  ].join('\n'));
});
