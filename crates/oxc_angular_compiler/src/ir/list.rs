//! OpList: A doubly-linked list for IR operations.
//!
//! The OpList is the core data structure used to hold IR operations during
//! compilation. It supports efficient insertion, removal, and traversal,
//! which is essential for the 67 transformation phases that mutate the IR.
//!
//! Ported from Angular's `template/pipeline/ir/src/ops/ops.ts`.

use std::marker::PhantomData;
use std::ptr::NonNull;

use oxc_allocator::Allocator;

use super::ops::{CreateOp, Op, UpdateOp};

/// A doubly-linked list of IR operations.
///
/// The list is designed to support in-place mutation during transformation
/// phases. Operations can be inserted before/after other operations, and
/// operations can be removed without invalidating other references.
pub struct OpList<'a, T: Op> {
    /// Head of the list (first operation).
    head: Option<NonNull<T>>,
    /// Tail of the list (last operation).
    tail: Option<NonNull<T>>,
    /// Number of operations in the list.
    len: usize,
    /// Allocator for new operations.
    allocator: &'a Allocator,
    /// Phantom data for lifetime.
    _marker: PhantomData<&'a T>,
}

impl<'a, T: Op> OpList<'a, T> {
    /// Creates a new empty OpList.
    pub fn new(allocator: &'a Allocator) -> Self {
        Self { head: None, tail: None, len: 0, allocator, _marker: PhantomData }
    }

    /// Returns the allocator used by this list.
    pub fn allocator(&self) -> &'a Allocator {
        self.allocator
    }

    /// Returns true if the list is empty.
    pub fn is_empty(&self) -> bool {
        self.len == 0
    }

    /// Returns the number of operations in the list.
    pub fn len(&self) -> usize {
        self.len
    }

    /// Returns the first operation in the list.
    pub fn head(&self) -> Option<&T> {
        // SAFETY: head is always valid if Some
        self.head.map(|ptr| unsafe { ptr.as_ref() })
    }

    /// Returns the last operation in the list.
    pub fn tail(&self) -> Option<&T> {
        // SAFETY: tail is always valid if Some
        self.tail.map(|ptr| unsafe { ptr.as_ref() })
    }

    /// Returns a mutable reference to the first operation.
    pub fn head_mut(&mut self) -> Option<&mut T> {
        // SAFETY: head is always valid if Some
        self.head.map(|mut ptr| unsafe { ptr.as_mut() })
    }

    /// Returns a mutable reference to the last operation.
    pub fn tail_mut(&mut self) -> Option<&mut T> {
        // SAFETY: tail is always valid if Some
        self.tail.map(|mut ptr| unsafe { ptr.as_mut() })
    }

    /// Returns a raw pointer to the first operation.
    ///
    /// This is useful for low-level list manipulation when you need to
    /// iterate and modify the list simultaneously.
    pub fn head_ptr(&self) -> Option<NonNull<T>> {
        self.head
    }

    /// Returns a raw pointer to the last operation.
    pub fn tail_ptr(&self) -> Option<NonNull<T>> {
        self.tail
    }

    /// Re-links an existing arena-allocated operation to the end of the list.
    ///
    /// This is used after removing an operation to re-add it at a different position.
    /// The operation must have been previously removed from this list.
    ///
    /// # Safety
    /// The `op` pointer must point to a valid operation that was previously
    /// removed from this list and is still arena-allocated.
    pub unsafe fn push_existing(&mut self, op: NonNull<T>) {
        // SAFETY: op is a valid pointer to an arena-allocated operation
        unsafe {
            // Clear old links
            (*op.as_ptr()).set_prev(None);
            (*op.as_ptr()).set_next(None);

            // Link to end of list
            if let Some(mut tail) = self.tail {
                tail.as_mut().set_next(Some(op));
                (*op.as_ptr()).set_prev(Some(tail));
            } else {
                self.head = Some(op);
            }
            self.tail = Some(op);
        }
        self.len += 1;
    }

    /// Re-inserts an existing arena-allocated operation before another operation.
    ///
    /// This is used during i18n slot dependency reordering to move operations
    /// to a specific position in the list without allocating new memory.
    ///
    /// # Safety
    /// - `existing` must point to a valid operation that was previously removed
    ///   from this list and is still arena-allocated.
    /// - `before` must point to a valid operation currently in this list.
    pub unsafe fn insert_before_existing(&mut self, before: NonNull<T>, existing: NonNull<T>) {
        // SAFETY: both pointers are valid per the safety contract
        unsafe {
            let prev = (*before.as_ptr()).prev();

            // Link existing operation
            (*existing.as_ptr()).set_prev(prev);
            (*existing.as_ptr()).set_next(Some(before));

            // Update before's prev link
            (*before.as_ptr()).set_prev(Some(existing));

            // Update the previous node or head
            if let Some(mut prev) = prev {
                prev.as_mut().set_next(Some(existing));
            } else {
                self.head = Some(existing);
            }
        }
        self.len += 1;
    }

    /// Allocates a new operation and returns a NonNull pointer to it.
    fn alloc_op(&self, op: T) -> NonNull<T> {
        let ptr = self.allocator.alloc(op);
        NonNull::from(ptr)
    }

    /// Pushes an operation to the end of the list.
    pub fn push(&mut self, op: T) {
        let ptr = self.alloc_op(op);

        // SAFETY: ptr is freshly allocated and valid
        unsafe {
            (*ptr.as_ptr()).set_prev(self.tail);
            (*ptr.as_ptr()).set_next(None);

            if let Some(mut tail) = self.tail {
                tail.as_mut().set_next(Some(ptr));
            } else {
                self.head = Some(ptr);
            }
            self.tail = Some(ptr);
        }
        self.len += 1;
    }

    /// Pushes an operation to the front of the list.
    pub fn push_front(&mut self, op: T) {
        let ptr = self.alloc_op(op);

        // SAFETY: ptr is freshly allocated and valid
        unsafe {
            (*ptr.as_ptr()).set_prev(None);
            (*ptr.as_ptr()).set_next(self.head);

            if let Some(mut head) = self.head {
                head.as_mut().set_prev(Some(ptr));
            } else {
                self.tail = Some(ptr);
            }
            self.head = Some(ptr);
        }
        self.len += 1;
    }

    /// Inserts an operation before the given operation.
    ///
    /// # Safety
    /// The `before` pointer must point to a valid operation in this list.
    pub unsafe fn insert_before(&mut self, before: NonNull<T>, op: T) {
        let ptr = self.alloc_op(op);

        // SAFETY: before is a valid pointer in this list
        unsafe {
            let prev = (*before.as_ptr()).prev();

            (*ptr.as_ptr()).set_prev(prev);
            (*ptr.as_ptr()).set_next(Some(before));
            (*before.as_ptr()).set_prev(Some(ptr));

            if let Some(mut prev) = prev {
                prev.as_mut().set_next(Some(ptr));
            } else {
                self.head = Some(ptr);
            }
        }

        self.len += 1;
    }

    /// Inserts an operation after the given operation.
    ///
    /// # Safety
    /// The `after` pointer must point to a valid operation in this list.
    pub unsafe fn insert_after(&mut self, after: NonNull<T>, op: T) {
        let _ = unsafe { self.insert_after_returning_new(after, op) };
    }

    /// Inserts an operation after the given operation and returns a pointer to the new operation.
    ///
    /// # Safety
    /// The `after` pointer must point to a valid operation in this list.
    pub unsafe fn insert_after_returning_new(&mut self, after: NonNull<T>, op: T) -> NonNull<T> {
        let ptr = self.alloc_op(op);

        // SAFETY: after is a valid pointer in this list
        unsafe {
            let next = (*after.as_ptr()).next();

            (*ptr.as_ptr()).set_prev(Some(after));
            (*ptr.as_ptr()).set_next(next);
            (*after.as_ptr()).set_next(Some(ptr));

            if let Some(mut next) = next {
                next.as_mut().set_prev(Some(ptr));
            } else {
                self.tail = Some(ptr);
            }
        }

        self.len += 1;
        ptr
    }

    /// Removes an operation from the list.
    ///
    /// # Safety
    /// The `op` pointer must point to a valid operation in this list.
    pub unsafe fn remove(&mut self, op: NonNull<T>) {
        // SAFETY: op is a valid pointer in this list
        unsafe {
            let prev = (*op.as_ptr()).prev();
            let next = (*op.as_ptr()).next();

            if let Some(mut prev) = prev {
                prev.as_mut().set_next(next);
            } else {
                self.head = next;
            }

            if let Some(mut next) = next {
                next.as_mut().set_prev(prev);
            } else {
                self.tail = prev;
            }

            // Clear the removed operation's links
            (*op.as_ptr()).set_prev(None);
            (*op.as_ptr()).set_next(None);
        }

        self.len -= 1;
    }

    /// Replaces an operation with another operation.
    ///
    /// # Safety
    /// The `old` pointer must point to a valid operation in this list.
    pub unsafe fn replace(&mut self, old: NonNull<T>, new_op: T) {
        // SAFETY: Same preconditions apply to both functions
        let _ = unsafe { self.replace_returning_new(old, new_op) };
    }

    /// Replaces an operation with another operation and returns a pointer to the new operation.
    ///
    /// # Safety
    /// The `old` pointer must point to a valid operation in this list.
    pub unsafe fn replace_returning_new(&mut self, old: NonNull<T>, new_op: T) -> NonNull<T> {
        let new_ptr = self.alloc_op(new_op);

        // SAFETY: old is a valid pointer in this list
        unsafe {
            let prev = (*old.as_ptr()).prev();
            let next = (*old.as_ptr()).next();

            (*new_ptr.as_ptr()).set_prev(prev);
            (*new_ptr.as_ptr()).set_next(next);

            if let Some(mut prev) = prev {
                prev.as_mut().set_next(Some(new_ptr));
            } else {
                self.head = Some(new_ptr);
            }

            if let Some(mut next) = next {
                next.as_mut().set_prev(Some(new_ptr));
            } else {
                self.tail = Some(new_ptr);
            }

            // Clear the old operation's links
            (*old.as_ptr()).set_prev(None);
            (*old.as_ptr()).set_next(None);
        }

        new_ptr
    }

    /// Prepends all operations from another list to the front of this list.
    pub fn prepend(&mut self, other: &mut OpList<'a, T>) {
        if other.is_empty() {
            return;
        }

        if self.is_empty() {
            self.head = other.head;
            self.tail = other.tail;
            self.len = other.len;
        } else {
            // SAFETY: both lists have valid pointers
            unsafe {
                if let (Some(mut other_tail), Some(mut self_head)) = (other.tail, self.head) {
                    other_tail.as_mut().set_next(Some(self_head));
                    self_head.as_mut().set_prev(Some(other_tail));
                }
            }
            self.head = other.head;
            self.len += other.len;
        }

        // Clear the other list
        other.head = None;
        other.tail = None;
        other.len = 0;
    }

    /// Appends all operations from another list to the end of this list.
    pub fn append(&mut self, other: &mut OpList<'a, T>) {
        if other.is_empty() {
            return;
        }

        if self.is_empty() {
            self.head = other.head;
            self.tail = other.tail;
            self.len = other.len;
        } else {
            // SAFETY: both lists have valid pointers
            unsafe {
                if let (Some(mut self_tail), Some(mut other_head)) = (self.tail, other.head) {
                    self_tail.as_mut().set_next(Some(other_head));
                    other_head.as_mut().set_prev(Some(self_tail));
                }
            }
            self.tail = other.tail;
            self.len += other.len;
        }

        // Clear the other list
        other.head = None;
        other.tail = None;
        other.len = 0;
    }

    /// Returns an iterator over the operations.
    pub fn iter(&self) -> OpListIter<'_, T> {
        OpListIter { current: self.head, _marker: PhantomData }
    }

    /// Returns a mutable iterator over the operations.
    pub fn iter_mut(&mut self) -> OpListIterMut<'_, T> {
        OpListIterMut { current: self.head, _marker: PhantomData }
    }

    /// Returns a cursor for traversing and mutating the list.
    pub fn cursor(&mut self) -> OpListCursor<'_, 'a, T> {
        OpListCursor { list: self, current: None }
    }

    /// Returns a cursor starting at the head.
    pub fn cursor_front(&mut self) -> OpListCursor<'_, 'a, T> {
        let head = self.head;
        OpListCursor { list: self, current: head }
    }
}

impl<'a, T: Op + std::fmt::Debug> std::fmt::Debug for OpList<'a, T> {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("OpList")
            .field("len", &self.len)
            .field("head", &self.head.map(|p| unsafe { p.as_ref() }))
            .finish()
    }
}

/// Iterator over operations in an OpList.
pub struct OpListIter<'a, T: Op> {
    current: Option<NonNull<T>>,
    _marker: PhantomData<&'a T>,
}

impl<'a, T: Op> Iterator for OpListIter<'a, T> {
    type Item = &'a T;

    fn next(&mut self) -> Option<Self::Item> {
        self.current.map(|ptr| {
            // SAFETY: ptr is valid as it was obtained from the list
            let op = unsafe { ptr.as_ref() };
            self.current = op.next();
            op
        })
    }
}

/// Mutable iterator over operations in an OpList.
pub struct OpListIterMut<'a, T: Op> {
    current: Option<NonNull<T>>,
    _marker: PhantomData<&'a mut T>,
}

impl<'a, T: Op> Iterator for OpListIterMut<'a, T> {
    type Item = &'a mut T;

    fn next(&mut self) -> Option<Self::Item> {
        self.current.map(|mut ptr| {
            // SAFETY: ptr is valid as it was obtained from the list
            let op = unsafe { ptr.as_mut() };
            self.current = op.next();
            op
        })
    }
}

/// A cursor for traversing and mutating an OpList.
///
/// The cursor allows inserting and removing operations while traversing.
pub struct OpListCursor<'b, 'a, T: Op>
where
    'a: 'b,
{
    list: &'b mut OpList<'a, T>,
    current: Option<NonNull<T>>,
}

impl<'b, 'a, T: Op> OpListCursor<'b, 'a, T> {
    /// Returns the current operation.
    pub fn current(&self) -> Option<&T> {
        // SAFETY: current is valid as it was obtained from the list
        self.current.map(|ptr| unsafe { ptr.as_ref() })
    }

    /// Returns a mutable reference to the current operation.
    pub fn current_mut(&mut self) -> Option<&mut T> {
        // SAFETY: current is valid as it was obtained from the list
        self.current.map(|mut ptr| unsafe { ptr.as_mut() })
    }

    /// Returns a pointer to the current operation.
    pub fn current_ptr(&self) -> Option<NonNull<T>> {
        self.current
    }

    /// Moves to the next operation.
    pub fn move_next(&mut self) -> bool {
        if let Some(current) = self.current {
            // SAFETY: current is valid as it was obtained from the list
            self.current = unsafe { current.as_ref().next() };
            self.current.is_some()
        } else {
            self.current = self.list.head;
            self.current.is_some()
        }
    }

    /// Moves to the previous operation.
    pub fn move_prev(&mut self) -> bool {
        if let Some(current) = self.current {
            // SAFETY: current is valid as it was obtained from the list
            self.current = unsafe { current.as_ref().prev() };
            self.current.is_some()
        } else {
            self.current = self.list.tail;
            self.current.is_some()
        }
    }

    /// Inserts an operation before the current position.
    pub fn insert_before(&mut self, op: T) {
        if let Some(current) = self.current {
            // SAFETY: current is valid as it was obtained from the list
            unsafe { self.list.insert_before(current, op) };
        } else {
            self.list.push_front(op);
        }
    }

    /// Inserts an operation after the current position.
    pub fn insert_after(&mut self, op: T) {
        if let Some(current) = self.current {
            // SAFETY: current is valid as it was obtained from the list
            unsafe { self.list.insert_after(current, op) };
        } else {
            self.list.push(op);
        }
    }

    /// Removes the current operation and moves to the next.
    pub fn remove_current(&mut self) {
        if let Some(current) = self.current {
            // SAFETY: current is valid as it was obtained from the list
            let next = unsafe { current.as_ref().next() };
            unsafe { self.list.remove(current) };
            self.current = next;
        }
    }

    /// Replaces the current operation with a new one.
    pub fn replace_current(&mut self, op: T) {
        if let Some(current) = self.current {
            // SAFETY: current is valid as it was obtained from the list
            // We need to update self.current to point to the new node, since
            // the old node's next/prev pointers are cleared by replace().
            // This ensures move_next() works correctly after replacement.
            let new_ptr = unsafe { self.list.replace_returning_new(current, op) };
            self.current = Some(new_ptr);
        }
    }
}

/// Type alias for a list of create operations.
pub type CreateOpList<'a> = OpList<'a, CreateOp<'a>>;

/// Type alias for a list of update operations.
pub type UpdateOpList<'a> = OpList<'a, UpdateOp<'a>>;

#[cfg(test)]
mod tests {
    use super::*;
    use crate::ir::enums::OpKind;
    use crate::ir::ops::{CreateOpBase, ListEndOp};

    fn create_list_end_op<'a>() -> CreateOp<'a> {
        CreateOp::ListEnd(ListEndOp { base: CreateOpBase::default() })
    }

    #[test]
    fn test_push_and_iterate() {
        let allocator = Allocator::default();
        let mut list: CreateOpList = OpList::new(&allocator);

        list.push(create_list_end_op());
        list.push(create_list_end_op());
        list.push(create_list_end_op());

        assert_eq!(list.len(), 3);

        let kinds: Vec<_> = list.iter().map(|op| op.kind()).collect();
        assert_eq!(kinds, vec![OpKind::ListEnd, OpKind::ListEnd, OpKind::ListEnd]);
    }

    #[test]
    fn test_push_front() {
        let allocator = Allocator::default();
        let mut list: CreateOpList = OpList::new(&allocator);

        list.push(create_list_end_op());
        list.push_front(create_list_end_op());

        assert_eq!(list.len(), 2);
        assert!(list.head().is_some());
        assert!(list.tail().is_some());
    }

    #[test]
    fn test_cursor_insert_and_remove() {
        let allocator = Allocator::default();
        let mut list: CreateOpList = OpList::new(&allocator);

        list.push(create_list_end_op());
        list.push(create_list_end_op());

        {
            let mut cursor = list.cursor_front();
            cursor.insert_after(create_list_end_op());
        }

        assert_eq!(list.len(), 3);
    }
}
