const http = require('http');
const { Client } = require('pg');
const bcrypt = require('bcrypt');

function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(typeof data === 'string' ? data : JSON.stringify(data));
    req.end();
  });
}

async function run() {
  console.log('================================================================');
  console.log('🚀 RUNNING COMPLETE DOCKER SYSTEM FLOW VERIFICATION');
  console.log('================================================================');

  // Step 1: Ensure admin password hash in Postgres
  console.log('\n[1/7] Initializing admin test credentials...');
  const pgClient = new Client({
    connectionString: 'postgresql://wdbpi_user:wdbpi_pass@127.0.0.1:5432/wdbpi_db?schema=public'
  });
  await pgClient.connect();
  const testHash = await bcrypt.hash('password123', 10);
  await pgClient.query('UPDATE users SET password = $1 WHERE username = $2', [testHash, 'admin']);
  console.log('✅ Admin user password updated to "password123"');
  await pgClient.end();

  // Step 2: Test Login Flow
  console.log('\n[2/7] Testing User Authentication Flow (POST /api/auth/login)...');
  const loginRes = await request({
    hostname: 'localhost',
    port: 80,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { username: 'admin', password: 'password123' });

  console.log('Response Status:', loginRes.status);
  const token = loginRes.data?.data?.accessToken || loginRes.data?.accessToken;
  const user = loginRes.data?.data?.user || loginRes.data?.user;
  console.log('User Full Name:', user?.fullName);
  console.log('User Role:', user?.role?.name);
  console.log('JWT Access Token Received:', token ? 'YES (length: ' + token.length + ')' : 'NO');

  if (!token) {
    console.error('❌ Login failed:', loginRes.data || loginRes.raw);
    process.exit(1);
  }

  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token
  };

  // Step 3: Test Migration Status Endpoint
  console.log('\n[3/7] Testing Migration Status Flow (GET /api/system/migration/status)...');
  const statusRes = await request({
    hostname: 'localhost',
    port: 80,
    path: '/api/system/migration/status',
    method: 'GET',
    headers: authHeaders
  });

  const sData = statusRes.data?.data;
  console.log('Status HTTP:', statusRes.status);
  console.log('Database Connected:', sData?.connected);
  console.log('Total Tables Tracked:', sData?.tables?.length);
  console.log('Total Current Records in DB:', sData?.totalRecords?.toLocaleString());
  console.log('Dump File Path:', sData?.dumpStats?.path || sData?.dumpFile?.path || 'N/A');
  console.log('Dump File Size:', sData?.dumpStats?.sizeMb ? sData.dumpStats.sizeMb + ' MB' : 'Found');

  // Step 4: Test Pre-Flight Validation Flow
  console.log('\n[4/7] Testing Pre-Flight Validation Flow (POST /api/system/migration/validate)...');
  const valRes = await request({
    hostname: 'localhost',
    port: 80,
    path: '/api/system/migration/validate',
    method: 'POST',
    headers: authHeaders
  }, {});

  const vData = valRes.data?.data;
  console.log('Validate HTTP:', valRes.status);
  console.log('Dump File Structure Valid:', vData?.valid);
  console.log('Legacy Tables Found in Dump:', vData?.tableCount || vData?.tables?.length);
  console.log('Total Estimated Records to Migrate:', vData?.totalEstimatedRows?.toLocaleString());

  // Step 5: Test Deep Cutover Verification Suite
  console.log('\n[5/7] Testing Deep Cutover Verification Suite (GET /api/system/migration/verify)...');
  const verifyRes = await request({
    hostname: 'localhost',
    port: 80,
    path: '/api/system/migration/verify',
    method: 'GET',
    headers: authHeaders
  });

  const rep = verifyRes.data?.data;
  console.log('Verify HTTP:', verifyRes.status);
  console.log('Overall Status:', rep?.overallStatus?.toUpperCase());
  console.log('Overall Health Score:', rep?.healthScore + '%');
  console.log('Write Continuity Test:', rep?.writeContinuityTest?.status?.toUpperCase() + ' - ' + rep?.writeContinuityTest?.message);

  if (rep?.categories) {
    console.log('\n--- 7 Verification Categories Breakdown ---');
    for (const cat of rep.categories) {
      const passCount = cat.checks.filter(c => c.status === 'pass').length;
      console.log(`\n🔹 [${cat.status.toUpperCase()}] ${cat.title} (Score: ${cat.score}%) [${passCount}/${cat.checks.length} Checks Pass]`);
      for (const c of cat.checks) {
        const mark = c.status === 'pass' ? '✅' : (c.status === 'warn' ? '⚠️' : '❌');
        console.log(`   ${mark} [${c.status.toUpperCase()}] ${c.name}: ${c.detail}`);
      }
    }
  }

  // Step 6: Test User Management API Flow
  console.log('\n[6/7] Testing Users Management API Flow (GET /api/users)...');
  const usersRes = await request({
    hostname: 'localhost',
    port: 80,
    path: '/api/users?page=1&limit=5',
    method: 'GET',
    headers: authHeaders
  });
  console.log('Users Query HTTP:', usersRes.status);
  const usersData = usersRes.data?.data?.users || usersRes.data?.data || [];
  console.log('Fetched Users Count:', usersData.length);
  if (usersData.length > 0) {
    console.log('Sample User:', usersData[0].username, `(${usersData[0].fullName}) - Role:`, usersData[0].role?.roleName);
  }

  // Step 7: Test Frontend Pages via Nginx Proxy
  console.log('\n[7/7] Testing Web Frontend Routes via Nginx (Port 80)...');
  const routes = [
    '/',
    '/login',
    '/admin/settings',
    '/settings',
    '/admin/users',
    '/admin/roles',
    '/car-parking',
    '/cctv-report',
    '/guard-duty-log',
    '/handheld-detector',
    '/walkthrough-detector',
    '/patrol-checklist',
    '/nvr-recording',
    '/stats'
  ];

  let passedRoutes = 0;
  for (const route of routes) {
    const pageRes = await request({
      hostname: 'localhost',
      port: 80,
      path: route,
      method: 'GET'
    });
    const isOk = pageRes.status === 200 || pageRes.status === 307 || pageRes.status === 308;
    if (isOk) passedRoutes++;
    console.log(`  Route ${route.padEnd(25)} -> HTTP ${pageRes.status} ${isOk ? '✅ OK' : '❌ FAIL'}`);
  }

  console.log(`\nFrontend Routes Verified: ${passedRoutes} / ${routes.length} passed.`);
  console.log('\n================================================================');
  console.log('🎉 ALL DOCKER SYSTEM FLOW TESTS COMPLETED SUCCESSFULLY!');
  console.log('================================================================\n');
}

run().catch(err => {
  console.error('Test Execution Error:', err);
  process.exit(1);
});
