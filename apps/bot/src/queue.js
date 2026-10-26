export function createJobQueue() {
  let active = null;
  const waiters = [];

  return {
    getActive() {
      return active;
    },
    isBusy() {
      return active !== null;
    },
    async enqueue(job) {
      if (active) {
        return new Promise((resolve, reject) => {
          waiters.push({ job, resolve, reject });
        });
      }
      active = job;
      return job;
    },
    complete(jobId) {
      if (!active || active.id !== jobId) {
        return false;
      }
      active = null;
      const next = waiters.shift();
      if (next) {
        active = next.job;
        next.resolve(next.job);
      }
      return true;
    },
    clear() {
      active = null;
      while (waiters.length) {
        const w = waiters.shift();
        w.reject(new Error("queue cleared"));
      }
    },
  };
}
