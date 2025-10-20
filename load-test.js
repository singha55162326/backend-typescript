const http = require('http');
const cluster = require('cluster');
const numCPUs = require('os').cpus().length;

// Configuration
const TARGET_URL = process.env.TARGET_URL || 'http://localhost:5000';
const CONCURRENT_USERS = parseInt(process.env.CONCURRENT_USERS) || 100;
const TEST_DURATION = parseInt(process.env.TEST_DURATION) || 60; // seconds
const REQUEST_DELAY = parseInt(process.env.REQUEST_DELAY) || 100; // ms

if (cluster.isMaster) {
  console.log(`Master ${process.pid} is running`);
  console.log(`Starting load test with ${CONCURRENT_USERS} concurrent users for ${TEST_DURATION} seconds`);
  console.log(`Target: ${TARGET_URL}`);

  // Fork workers
  for (let i = 0; i < Math.min(numCPUs, CONCURRENT_USERS); i++) {
    cluster.fork();
  }

  // Keep track of results
  let totalRequests = 0;
  let successfulRequests = 0;
  let failedRequests = 0;
  let totalResponseTime = 0;
  let startTime = Date.now();

  // Collect results from workers
  cluster.on('message', (worker, message) => {
    if (message.type === 'result') {
      totalRequests += message.totalRequests;
      successfulRequests += message.successfulRequests;
      failedRequests += message.failedRequests;
      totalResponseTime += message.totalResponseTime;
    }
  });

  // Test duration timer
  setTimeout(() => {
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000; // seconds
    const avgResponseTime = successfulRequests > 0 ? totalResponseTime / successfulRequests : 0;
    const requestsPerSecond = totalRequests / duration;

    console.log('\n=== LOAD TEST RESULTS ===');
    console.log(`Duration: ${duration.toFixed(2)} seconds`);
    console.log(`Total Requests: ${totalRequests}`);
    console.log(`Successful Requests: ${successfulRequests}`);
    console.log(`Failed Requests: ${failedRequests}`);
    console.log(`Success Rate: ${(successfulRequests / totalRequests * 100).toFixed(2)}%`);
    console.log(`Average Response Time: ${avgResponseTime.toFixed(2)} ms`);
    console.log(`Requests Per Second: ${requestsPerSecond.toFixed(2)}`);

    // Kill all workers
    for (const id in cluster.workers) {
      cluster.workers[id].kill();
    }

    process.exit(0);
  }, TEST_DURATION * 1000);

} else {
  // Worker process
  console.log(`Worker ${process.pid} started`);

  let totalRequests = 0;
  let successfulRequests = 0;
  let failedRequests = 0;
  let totalResponseTime = 0;

  // Function to make a single request
  function makeRequest() {
    return new Promise((resolve) => {
      totalRequests++;
      const startTime = Date.now();

      const req = http.get(`${TARGET_URL}/api/health`, (res) => {
        const endTime = Date.now();
        const responseTime = endTime - startTime;

        totalResponseTime += responseTime;

        if (res.statusCode >= 200 && res.statusCode < 300) {
          successfulRequests++;
        } else {
          failedRequests++;
        }

        resolve();
      });

      req.on('error', (err) => {
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        totalResponseTime += responseTime;
        failedRequests++;
        resolve();
      });

      req.setTimeout(5000, () => {
        req.destroy();
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        totalResponseTime += responseTime;
        failedRequests++;
        resolve();
      });
    });
  }

  // Function to simulate a user
  async function simulateUser() {
    while (true) {
      await makeRequest();
      await new Promise(resolve => setTimeout(resolve, REQUEST_DELAY));
    }
  }

  // Start user simulations
  for (let i = 0; i < Math.ceil(CONCURRENT_USERS / numCPUs); i++) {
    simulateUser();
  }

  // Report results periodically
  setInterval(() => {
    process.send({
      type: 'result',
      totalRequests,
      successfulRequests,
      failedRequests,
      totalResponseTime
    });

    // Reset counters
    totalRequests = 0;
    successfulRequests = 0;
    failedRequests = 0;
    totalResponseTime = 0;
  }, 5000);
}