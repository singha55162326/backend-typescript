import cluster from 'cluster';
import os from 'os';
import dotenv from 'dotenv';

dotenv.config();

const numCPUs = process.env.CLUSTER_WORKERS 
  ? parseInt(process.env.CLUSTER_WORKERS, 10) 
  : os.cpus().length;

class ClusterService {
  static run(fn: () => void): void {
    if (cluster.isMaster || cluster.isPrimary) {
      console.log(`Master ${process.pid} is running`);
      console.log(`Setting up cluster with ${numCPUs} workers`);

      // Fork workers
      for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
      }

      // Worker event handlers
      cluster.on('online', (worker) => {
        console.log(`Worker ${worker.process.pid} is online`);
      });

      cluster.on('exit', (worker, code, signal) => {
        console.log(`Worker ${worker.process.pid} died with code ${code} and signal ${signal}`);
        console.log('Starting a new worker');
        cluster.fork();
      });

      // Graceful shutdown
      process.on('SIGTERM', () => {
        console.log('SIGTERM received, shutting down gracefully');
        for (const worker in cluster.workers) {
          cluster.workers[worker]?.kill();
        }
        process.exit(0);
      });

      process.on('SIGINT', () => {
        console.log('SIGINT received, shutting down gracefully');
        for (const worker in cluster.workers) {
          cluster.workers[worker]?.kill();
        }
        process.exit(0);
      });

    } else {
      // Workers can share any TCP connection
      // In this case it is an HTTP server
      console.log(`Worker ${process.pid} started`);
      fn();
    }
  }

  /**
   * Get cluster information
   */
  static getClusterInfo(): {
    isMaster: boolean;
    workerId: number | null;
    numWorkers: number;
    totalMem: number;
    freeMem: number;
  } {
    return {
      isMaster: cluster.isMaster || cluster.isPrimary,
      workerId: cluster.worker ? cluster.worker.id : null,
      numWorkers: numCPUs,
      totalMem: os.totalmem(),
      freeMem: os.freemem()
    };
  }

  /**
   * Send message to all workers
   * @param message Message to send
   */
  static broadcastToWorkers(message: any): void {
    if (cluster.isMaster || cluster.isPrimary) {
      for (const workerId in cluster.workers) {
        cluster.workers[workerId]?.send(message);
      }
    }
  }

  /**
   * Send message to master
   * @param message Message to send
   */
  static sendToMaster(message: any): void {
    if (!(cluster.isMaster || cluster.isPrimary)) {
      process.send?.(message);
    }
  }
}

export default ClusterService;