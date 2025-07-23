import { execSync } from 'child_process';
import * as net from 'net';
import { promisify } from 'util';

const TEST_DATABASE_URL =
  'postgresql://destino_test:E7toVQos1QZuUi0KlgriErg1hRI9vkTE1esIUaZjqcNOb54pXhB79av2qkQ4wOOb@5.78.141.250:5433/postgres?sslmode=require';

console.log('🔍 Database Connection Diagnostics');
console.log('================================');
console.log('');

// Parse the connection URL
function parseConnectionUrl(url: string) {
  const match = url.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)/);
  if (!match) {
    throw new Error('Invalid connection URL format');
  }

  return {
    username: match[1],
    password: match[2],
    host: match[3],
    port: parseInt(match[4]),
    database: match[5],
  };
}

// Test network connectivity
async function testNetworkConnectivity(host: string, port: number): Promise<boolean> {
  return new Promise(resolve => {
    const socket = new net.Socket();
    const timeout = 10000; // 10 seconds

    socket.setTimeout(timeout);

    socket.on('connect', () => {
      console.log(`✅ Network connection successful to ${host}:${port}`);
      socket.destroy();
      resolve(true);
    });

    socket.on('timeout', () => {
      console.log(`❌ Network connection timeout to ${host}:${port} (${timeout}ms)`);
      socket.destroy();
      resolve(false);
    });

    socket.on('error', (error: any) => {
      console.log(`❌ Network connection failed to ${host}:${port}`);
      console.log(`   Error: ${error.message}`);
      resolve(false);
    });

    socket.connect(port, host);
  });
}

// Test DNS resolution
async function testDnsResolution(host: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const dns = require('dns');
    dns.lookup(host, { all: true }, (err: any, addresses: any[]) => {
      if (err) {
        console.log(`❌ DNS resolution failed for ${host}`);
        console.log(`   Error: ${err.message}`);
        reject(err);
      } else {
        const ips = addresses.map(addr => addr.address);
        console.log(`✅ DNS resolution successful for ${host}:`);
        ips.forEach(ip => console.log(`   - ${ip}`));
        resolve(ips);
      }
    });
  });
}

// Test with ping (if available)
function testPing(host: string): boolean {
  try {
    console.log(`⏳ Testing ping to ${host}...`);
    const result = execSync(`ping -c 4 ${host}`, { encoding: 'utf8', timeout: 10000 });
    console.log('✅ Ping successful');
    console.log(result.split('\n').slice(-2).join('\n'));
    return true;
  } catch (error: any) {
    console.log('❌ Ping failed or ping command not available');
    console.log(`   ${error.message}`);
    return false;
  }
}

// Test with telnet (if available)
function testTelnet(host: string, port: number): boolean {
  try {
    console.log(`⏳ Testing telnet to ${host}:${port}...`);
    // This will timeout after 5 seconds
    const result = execSync(`timeout 5s telnet ${host} ${port}`, {
      encoding: 'utf8',
      timeout: 6000,
      stdio: 'pipe',
    });
    console.log('✅ Telnet connection successful');
    return true;
  } catch (error: any) {
    console.log('❌ Telnet failed or telnet command not available');
    return false;
  }
}

// Test with nc (netcat) if available
function testNetcat(host: string, port: number): boolean {
  try {
    console.log(`⏳ Testing netcat to ${host}:${port}...`);
    const result = execSync(`nc -z -v -w5 ${host} ${port}`, {
      encoding: 'utf8',
      timeout: 6000,
    });
    console.log('✅ Netcat connection successful');
    console.log(`   ${result.trim()}`);
    return true;
  } catch (error: any) {
    console.log('❌ Netcat failed or nc command not available');
    return false;
  }
}

// Check local network configuration
function checkNetworkConfig(): void {
  console.log('\n🌐 Network Configuration:');

  try {
    // Check network interfaces
    console.log('\n📡 Network Interfaces:');
    const interfaces = require('os').networkInterfaces();
    for (const [name, addrs] of Object.entries(interfaces)) {
      const nonInternal = (addrs as any[]).filter(addr => !addr.internal);
      if (nonInternal.length > 0) {
        console.log(`  ${name}:`);
        nonInternal.forEach(addr => {
          console.log(`    - ${addr.address} (${addr.family})`);
        });
      }
    }
  } catch (error) {
    console.log('❌ Could not get network interface information');
  }

  try {
    // Check default gateway (macOS/Linux)
    console.log('\n🚪 Default Gateway:');
    const gateway = execSync('route -n get default | grep gateway', { encoding: 'utf8' });
    console.log(`  ${gateway.trim()}`);
  } catch (error) {
    try {
      // Alternative for Linux
      const gateway = execSync('ip route | grep default', { encoding: 'utf8' });
      console.log(`  ${gateway.trim()}`);
    } catch (error2) {
      console.log('❌ Could not determine default gateway');
    }
  }
}

// Main diagnostic function
async function runDiagnostics(): Promise<void> {
  try {
    const config = parseConnectionUrl(TEST_DATABASE_URL);

    console.log('🎯 Target Database:');
    console.log(`   Host: ${config.host}`);
    console.log(`   Port: ${config.port}`);
    console.log(`   Database: ${config.database}`);
    console.log(`   Username: ${config.username}`);
    console.log('');

    // 1. DNS Resolution Test
    console.log('1️⃣ DNS Resolution Test');
    console.log('=====================');
    try {
      await testDnsResolution(config.host);
    } catch (error) {
      console.log('⚠️  DNS resolution failed - this might be the issue');
    }
    console.log('');

    // 2. Network connectivity tests
    console.log('2️⃣ Network Connectivity Tests');
    console.log('============================');

    // Test basic network connectivity
    console.log('⏳ Testing socket connection...');
    const networkOk = await testNetworkConnectivity(config.host, config.port);
    console.log('');

    // Test ping
    testPing(config.host);
    console.log('');

    // Test with external tools
    console.log('3️⃣ External Tool Tests');
    console.log('====================');
    testNetcat(config.host, config.port);
    testTelnet(config.host, config.port);
    console.log('');

    // 4. Network configuration
    console.log('4️⃣ Local Network Configuration');
    console.log('==============================');
    checkNetworkConfig();
    console.log('');

    // 5. Recommendations
    console.log('5️⃣ Recommendations');
    console.log('=================');

    if (!networkOk) {
      console.log('❌ Network connectivity failed. Possible causes:');
      console.log('   1. Database server is down or not running');
      console.log('   2. Firewall blocking the connection');
      console.log('   3. Incorrect host/port configuration');
      console.log('   4. VPN or proxy interference');
      console.log('   5. Network routing issues');
      console.log('');
      console.log('💡 Suggested actions:');
      console.log('   1. Verify the database server is running');
      console.log('   2. Check if you need to be on a specific VPN');
      console.log('   3. Contact your database administrator');
      console.log('   4. Try from a different network');
      console.log('   5. Check if the port 5433 is open');
    } else {
      console.log('✅ Network connectivity appears to be working');
      console.log('💡 The issue might be:');
      console.log('   1. PostgreSQL authentication');
      console.log('   2. SSL configuration');
      console.log('   3. Database permissions');
      console.log('   4. Connection string format');
    }
  } catch (error: any) {
    console.error('❌ Diagnostic failed:', error.message);
  }
}

// Run diagnostics
runDiagnostics().catch(console.error);
