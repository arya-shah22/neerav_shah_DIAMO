// Post-processes the Prisma-generated prisma/schema.sql to make every table
// InnoDB. `prisma migrate diff` emits no ENGINE clause, so tables inherit the
// MySQL server default — which is MyISAM on WAMP/XAMPP and breaks transactions,
// foreign keys and the voucher/stock atomic-sequence logic. Run automatically
// by the `db:gen-sql` npm script.
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'schema.sql');
let sql = fs.readFileSync(file, 'utf-8');

// Every generated CREATE TABLE ends with `) DEFAULT CHARACTER SET ...;`.
// Insert ENGINE=InnoDB unless an engine is already specified.
const before = sql;
sql = sql.replace(/^\) (DEFAULT CHARACTER SET)/gm, ') ENGINE=InnoDB $1');

if (sql !== before) {
  fs.writeFileSync(file, sql, 'utf-8');
}
const count = (sql.match(/\) ENGINE=InnoDB /g) || []).length;
console.log(`[force-innodb] schema.sql now has ${count} InnoDB tables`);
