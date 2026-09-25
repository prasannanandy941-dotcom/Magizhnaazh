// Data structures used across Magizhnaazh. Browser-safe (no Node imports) so
// both the web apps and the services can use them.
//
//   indexBy        HashMap  — O(1) lookup of an item by its id
//   Trie           Trie     — prefix search for the marketplace search box
//   JobQueue       Queue    — FIFO background jobs with retries (slot sync)
//   buildCoBookingGraph / topNeighbours
//                  Graph    — "often booked together" vendor recommendations
//
// Sets and frequency Maps are used inline where they're needed (see the
// comments at each use site).

// ---------------------------------------------------------------------------
// HashMap: index a list by a key once, then look items up in O(1) instead of
// scanning the whole array with .find() every time (O(n) each).
//   const byId = indexBy(events, (e) => e.id);   byId.get(booking.eventId)
// ---------------------------------------------------------------------------
export function indexBy<T, K>(items: readonly T[], key: (item: T) => K): Map<K, T> {
  const map = new Map<K, T>();
  for (const item of items) map.set(key(item), item);
  return map;
}

// ---------------------------------------------------------------------------
// Trie (prefix tree): every character is a node, so finding all entries that
// start with what the user typed costs O(length of the prefix) to reach the
// node, plus the matches collected under it — no scan of every entry.
//
// Each inserted entry can be reached from several "keys" (e.g. a vendor is
// found by any word of its name, its category or its city), so typing "cat"
// finds "Caterings of Mughals" and every vendor in the "Catering" category.
// ---------------------------------------------------------------------------
interface TrieNode<T> {
  children: Map<string, TrieNode<T>>;
  items: Set<T>; // entries whose key ends exactly at this node
}

export class Trie<T> {
  private root: TrieNode<T> = { children: new Map(), items: new Set() };

  insert(key: string, item: T): void {
    let node = this.root;
    for (const ch of key.toLowerCase().trim()) {
      let next = node.children.get(ch);
      if (!next) {
        next = { children: new Map(), items: new Set() };
        node.children.set(ch, next);
      }
      node = next;
    }
    node.items.add(item);
  }

  // Everything whose key starts with `prefix`, at most `limit` distinct items.
  search(prefix: string, limit = 8): T[] {
    let node: TrieNode<T> | undefined = this.root;
    for (const ch of prefix.toLowerCase().trim()) {
      node = node.children.get(ch);
      if (!node) return [];
    }
    const out = new Set<T>();
    // Breadth-first so shorter (closer) matches come before longer ones.
    const queue: TrieNode<T>[] = [node];
    while (queue.length && out.size < limit) {
      const current = queue.shift()!;
      for (const item of current.items) {
        out.add(item);
        if (out.size >= limit) break;
      }
      for (const child of current.children.values()) queue.push(child);
    }
    return [...out];
  }
}

// ---------------------------------------------------------------------------
// Queue: jobs run one at a time in the order they were added (FIFO). A job
// that throws is retried with exponential backoff (1s, 2s, 4s, …) up to
// `maxAttempts`, so a brief outage of another service doesn't silently lose
// the work (e.g. a booked slot never getting blocked on the vendor calendar).
// ---------------------------------------------------------------------------
interface Job {
  name: string;
  run: () => Promise<void>;
  attempt: number;
}

export class JobQueue {
  private jobs: Job[] = [];
  private running = false;

  constructor(
    private readonly label: string,
    private readonly maxAttempts = 5,
    private readonly baseDelayMs = 1000,
  ) {}

  add(name: string, run: () => Promise<void>): void {
    this.jobs.push({ name, run, attempt: 1 });
    void this.drain();
  }

  get size(): number {
    return this.jobs.length;
  }

  private async drain(): Promise<void> {
    if (this.running) return;
    this.running = true;
    while (this.jobs.length) {
      const job = this.jobs.shift()!; // dequeue from the front (FIFO)
      try {
        await job.run();
      } catch (err) {
        if (job.attempt < this.maxAttempts) {
          const delay = this.baseDelayMs * 2 ** (job.attempt - 1);
          console.warn(`[${this.label}] ${job.name} failed (attempt ${job.attempt}), retrying in ${delay}ms:`, err);
          job.attempt += 1;
          // Re-enqueue after the backoff so other jobs aren't blocked meanwhile.
          setTimeout(() => { this.jobs.push(job); void this.drain(); }, delay);
        } else {
          console.error(`[${this.label}] ${job.name} failed after ${job.attempt} attempts, giving up:`, err);
        }
      }
    }
    this.running = false;
  }
}

// ---------------------------------------------------------------------------
// Graph: vendors are nodes; two vendors get an edge when they were booked for
// the SAME event, and the edge weight counts how many events they shared.
// Stored as an adjacency list: Map<vendorId, Map<neighbourId, weight>>.
// "Often booked together" for a vendor = its heaviest neighbours.
// ---------------------------------------------------------------------------
export type WeightedGraph = Map<string, Map<string, number>>;

export function buildCoBookingGraph(bookings: readonly { eventId: string; vendorId: string }[]): WeightedGraph {
  // Group vendor ids per event (a Set, so one vendor booked twice for the same
  // event counts once).
  const vendorsByEvent = new Map<string, Set<string>>();
  for (const b of bookings) {
    if (!b.eventId || !b.vendorId) continue;
    let set = vendorsByEvent.get(b.eventId);
    if (!set) vendorsByEvent.set(b.eventId, (set = new Set()));
    set.add(b.vendorId);
  }
  const graph: WeightedGraph = new Map();
  const addEdge = (a: string, b: string) => {
    let edges = graph.get(a);
    if (!edges) graph.set(a, (edges = new Map()));
    edges.set(b, (edges.get(b) || 0) + 1);
  };
  for (const vendors of vendorsByEvent.values()) {
    const list = [...vendors];
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        addEdge(list[i], list[j]);
        addEdge(list[j], list[i]);
      }
    }
  }
  return graph;
}

export function topNeighbours(graph: WeightedGraph, node: string, limit = 6): { id: string; weight: number }[] {
  const edges = graph.get(node);
  if (!edges) return [];
  return [...edges.entries()]
    .map(([id, weight]) => ({ id, weight }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, limit);
}
