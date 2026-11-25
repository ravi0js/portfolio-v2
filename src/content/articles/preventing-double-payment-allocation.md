---
title: 'Allocating payments without double counting: FIFO allocation with SELECT … FOR UPDATE'
description: 'Why read-then-write allocation breaks under concurrent requests, and how MySQL row locks, a fixed lock order and short transactions make it safe.'
date: 2026-11-25
tags: ['MySQL', 'Transactions', 'PHP']
draft: true
---

In the real-estate CRM/ERP I work on, a customer's payment receipt is allocated across the milestones of their booking: oldest outstanding milestone first, then the next, until the money runs out. It sounds like a loop over a few rows. The hard part is making sure the same money is never allocated twice when two requests arrive at the same time.

This post explains the pattern in general terms. The schema and code below are simplified for illustration; they are not taken from that codebase.

## The problem

Take a booking with these milestones, and a receipt of ₹4,50,000:

| Milestone  | Due       | Paid so far |
| ---------- | --------- | ----------- |
| Booking    | ₹2,00,000 | ₹0          |
| Foundation | ₹1,50,000 | ₹0          |
| Structure  | ₹2,50,000 | ₹0          |

FIFO allocation gives ₹2,00,000 to Booking, ₹1,50,000 to Foundation and the remaining ₹1,00,000 to Structure.

Now imagine the allocation runs twice at once: a double-clicked button, a client retry after a timeout, or a scheduled job overlapping with a user action. If each run reads the balances, computes the split and then writes, both read "nothing paid yet", and both write a full allocation. The booking now looks over-paid, and the ledger is wrong.

## Why "read, then write" isn't enough

The two runs interleave like this:

1. Run A reads the milestones: nothing paid.
2. Run B reads the milestones: nothing paid.
3. Run A writes its allocation.
4. Run B writes its allocation, based on data that is already stale.

Wrapping each run in a transaction doesn't fix this on its own. Under InnoDB's default `REPEATABLE READ` isolation, a plain `SELECT` is a consistent snapshot read and takes no locks, so both transactions can still read the same "unpaid" state.

## Lock the rows you depend on

The fix is to make the read itself take locks. `SELECT … FOR UPDATE` places exclusive locks on the rows it reads; a second transaction that tries to lock the same rows waits until the first one commits, and then sees the committed data.

The flow, all inside one transaction:

1. Lock the **receipt** row and check it hasn't been allocated already.
2. Lock the booking's **outstanding milestones**, ordered oldest first.
3. Allocate, insert the allocation rows, update the milestones, and mark the receipt as allocated.
4. Commit.

```php
function allocateReceipt(PDO $db, int $receiptId): void
{
    $db->beginTransaction();
    try {
        // 1. Lock the receipt first. A second run blocks here until we commit.
        $receipt = $db->prepare(
            'SELECT id, booking_id, amount, status FROM receipts WHERE id = ? FOR UPDATE'
        );
        $receipt->execute([$receiptId]);
        $r = $receipt->fetch(PDO::FETCH_ASSOC);

        if (!$r || $r['status'] === 'allocated') {
            $db->commit(); // already done: safe to call again
            return;
        }

        // 2. Lock outstanding milestones in a fixed order (oldest first).
        $ms = $db->prepare(
            'SELECT id, due, paid FROM milestones
             WHERE booking_id = ? AND paid < due
             ORDER BY due_date, id
             FOR UPDATE'
        );
        $ms->execute([$r['booking_id']]);

        // 3. FIFO allocation. Amounts are integers (paise), never floats.
        $left = (int) $r['amount'];
        $insert = $db->prepare('INSERT INTO allocations (receipt_id, milestone_id, amount) VALUES (?, ?, ?)');
        $update = $db->prepare('UPDATE milestones SET paid = paid + ? WHERE id = ?');

        foreach ($ms->fetchAll(PDO::FETCH_ASSOC) as $m) {
            if ($left === 0) break;
            $take = min((int) $m['due'] - (int) $m['paid'], $left);
            $insert->execute([$receiptId, $m['id'], $take]);
            $update->execute([$take, $m['id']]);
            $left -= $take;
        }

        $db->prepare("UPDATE receipts SET status = 'allocated', unallocated = ? WHERE id = ?")
           ->execute([$left, $receiptId]);

        $db->commit();
    } catch (Throwable $e) {
        $db->rollBack();
        throw $e;
    }
}
```

With this in place, the second run waits at step 1, then sees `status = 'allocated'` and returns without doing anything. Calling the function twice is safe.

## Details that matter

**Index the columns you lock by.** `FOR UPDATE` locks the index records it scans, not just the rows it returns. Without an index on `milestones (booking_id, due_date)`, MySQL may scan, and lock, far more rows than the booking you care about, and unrelated requests start waiting on each other.

**Always lock in the same order.** If one code path locks the receipt and then the milestones, and another locks milestones and then the receipt, two transactions can each hold what the other needs: a deadlock. Locking in one fixed order (receipt first, then milestones by `due_date, id`) prevents most of them.

**Still expect the occasional deadlock.** InnoDB detects deadlocks and rolls one transaction back with error 1213 (`SQLSTATE 40001`). Because the whole allocation is one transaction, it's safe to catch that error and retry the entire function once or twice.

**Keep the transaction short.** Locks are held until commit, so do nothing slow inside it: no HTTP calls, no PDF generation, no emails. Collect what needs to happen and run those side effects after the commit succeeds.

**Use a database constraint as a backstop.** A unique key on `allocations (receipt_id, milestone_id)` means a bug elsewhere can't silently insert the same allocation twice; it fails loudly instead.

**Store money as integers.** Allocation is repeated subtraction. With floating-point amounts, rounding errors appear quickly; integer paise (or `DECIMAL`) keep every rupee accounted for.

## Testing it

Unit tests won't catch a race condition; you need two connections. A simple check: open connection A, start a transaction and run the locking `SELECT` for a receipt; then, from connection B, call `allocateReceipt()` for the same receipt and confirm it blocks until A commits or rolls back. For a broader test, run the allocation for the same receipt from several processes at once and assert afterwards that the total allocated equals the receipt amount, never more.

## Takeaways

- A transaction alone doesn't prevent double allocation; locking reads do.
- Lock the receipt, then its milestones, always in that order, and keep the transaction short.
- Make the operation safe to repeat, and back it with a unique constraint.
- Index what you lock, and be ready to retry on deadlock.
