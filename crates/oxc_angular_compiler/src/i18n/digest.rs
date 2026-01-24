//! Message digest/ID generation for i18n.
//!
//! Provides SHA1 and fingerprint-based message ID generation for translation lookups.
//!
//! Ported from Angular's `i18n/digest.ts`.
//!
//! WARNING: The cryptographic functions here are not designed for security.
//! DO NOT USE THEM IN A SECURITY SENSITIVE CONTEXT.

use super::ast::{Message, Node, Visitor};

// ============================================================================
// Public API
// ============================================================================

/// Return the message id or compute it using the XLIFF1 digest.
pub fn digest(message: &Message) -> String {
    if !message.id.is_empty() { message.id.clone() } else { compute_digest(message) }
}

/// Compute the message id using the XLIFF1 digest (SHA1).
pub fn compute_digest(message: &Message) -> String {
    let serialized = serialize_nodes(&message.nodes);
    let input = format!("{}[{}]", serialized.join(""), message.meaning);
    sha1(&input)
}

/// Return the message id or compute it using the XLIFF2/XMB/$localize digest.
pub fn decimal_digest(message: &Message) -> String {
    if !message.id.is_empty() { message.id.clone() } else { compute_decimal_digest(message) }
}

/// Compute the message id using the XLIFF2/XMB/$localize digest.
pub fn compute_decimal_digest(message: &Message) -> String {
    let mut visitor = SerializerIgnoreIcuExpVisitor;
    let mut ctx = ();
    let parts: Vec<String> =
        message.nodes.iter().map(|n| n.visit(&mut visitor, &mut ctx)).collect();
    compute_msg_id(&parts.join(""), &message.meaning)
}

/// Serialize i18n nodes to strings for digest computation.
pub fn serialize_nodes(nodes: &[Node]) -> Vec<String> {
    let mut visitor = SerializerVisitor;
    let mut ctx = ();
    nodes.iter().map(|n| n.visit(&mut visitor, &mut ctx)).collect()
}

// ============================================================================
// Serializer Visitors
// ============================================================================

/// Serialize the i18n ast to XML-like format for UID generation.
struct SerializerVisitor;

impl Visitor for SerializerVisitor {
    type Context = ();
    type Result = String;

    fn visit_text(
        &mut self,
        text: &super::ast::Text,
        _context: &mut Self::Context,
    ) -> Self::Result {
        text.value.clone()
    }

    fn visit_container(
        &mut self,
        container: &super::ast::Container,
        context: &mut Self::Context,
    ) -> Self::Result {
        let children: Vec<String> =
            container.children.iter().map(|child| child.visit(self, context)).collect();
        format!("[{}]", children.join(", "))
    }

    fn visit_icu(&mut self, icu: &super::ast::Icu, context: &mut Self::Context) -> Self::Result {
        let cases: Vec<String> = icu
            .cases
            .iter()
            .map(|(k, v)| format!("{} {{{}}}", k, v.visit(self, context)))
            .collect();
        format!("{{{}, {}, {}}}", icu.expression, icu.icu_type.as_str(), cases.join(", "))
    }

    fn visit_tag_placeholder(
        &mut self,
        ph: &super::ast::TagPlaceholder,
        context: &mut Self::Context,
    ) -> Self::Result {
        if ph.is_void {
            format!("<ph tag name=\"{}\"/>", ph.start_name)
        } else {
            let children: Vec<String> =
                ph.children.iter().map(|child| child.visit(self, context)).collect();
            format!(
                "<ph tag name=\"{}\">{}</ph name=\"{}\">",
                ph.start_name,
                children.join(", "),
                ph.close_name
            )
        }
    }

    fn visit_placeholder(
        &mut self,
        ph: &super::ast::Placeholder,
        _context: &mut Self::Context,
    ) -> Self::Result {
        if !ph.value.is_empty() {
            format!("<ph name=\"{}\">{}</ph>", ph.name, ph.value)
        } else {
            format!("<ph name=\"{}\"/>", ph.name)
        }
    }

    fn visit_icu_placeholder(
        &mut self,
        ph: &super::ast::IcuPlaceholder,
        context: &mut Self::Context,
    ) -> Self::Result {
        format!("<ph icu name=\"{}\">{}</ph>", ph.name, self.visit_icu(&ph.value, context))
    }

    fn visit_block_placeholder(
        &mut self,
        ph: &super::ast::BlockPlaceholder,
        context: &mut Self::Context,
    ) -> Self::Result {
        let children: Vec<String> =
            ph.children.iter().map(|child| child.visit(self, context)).collect();
        format!(
            "<ph block name=\"{}\">{}</ph name=\"{}\">",
            ph.start_name,
            children.join(", "),
            ph.close_name
        )
    }
}

/// Serialize the i18n ast ignoring ICU expressions (for stable IDs).
struct SerializerIgnoreIcuExpVisitor;

impl Visitor for SerializerIgnoreIcuExpVisitor {
    type Context = ();
    type Result = String;

    fn visit_text(
        &mut self,
        text: &super::ast::Text,
        _context: &mut Self::Context,
    ) -> Self::Result {
        text.value.clone()
    }

    fn visit_container(
        &mut self,
        container: &super::ast::Container,
        context: &mut Self::Context,
    ) -> Self::Result {
        let children: Vec<String> =
            container.children.iter().map(|child| child.visit(self, context)).collect();
        format!("[{}]", children.join(", "))
    }

    fn visit_icu(&mut self, icu: &super::ast::Icu, context: &mut Self::Context) -> Self::Result {
        // Do not take the expression into account for stable IDs
        let cases: Vec<String> = icu
            .cases
            .iter()
            .map(|(k, v)| format!("{} {{{}}}", k, v.visit(self, context)))
            .collect();
        format!("{{{}, {}}}", icu.icu_type.as_str(), cases.join(", "))
    }

    fn visit_tag_placeholder(
        &mut self,
        ph: &super::ast::TagPlaceholder,
        context: &mut Self::Context,
    ) -> Self::Result {
        if ph.is_void {
            format!("<ph tag name=\"{}\"/>", ph.start_name)
        } else {
            let children: Vec<String> =
                ph.children.iter().map(|child| child.visit(self, context)).collect();
            format!(
                "<ph tag name=\"{}\">{}</ph name=\"{}\">",
                ph.start_name,
                children.join(", "),
                ph.close_name
            )
        }
    }

    fn visit_placeholder(
        &mut self,
        ph: &super::ast::Placeholder,
        _context: &mut Self::Context,
    ) -> Self::Result {
        if !ph.value.is_empty() {
            format!("<ph name=\"{}\">{}</ph>", ph.name, ph.value)
        } else {
            format!("<ph name=\"{}\"/>", ph.name)
        }
    }

    fn visit_icu_placeholder(
        &mut self,
        ph: &super::ast::IcuPlaceholder,
        context: &mut Self::Context,
    ) -> Self::Result {
        format!("<ph icu name=\"{}\">{}</ph>", ph.name, self.visit_icu(&ph.value, context))
    }

    fn visit_block_placeholder(
        &mut self,
        ph: &super::ast::BlockPlaceholder,
        context: &mut Self::Context,
    ) -> Self::Result {
        let children: Vec<String> =
            ph.children.iter().map(|child| child.visit(self, context)).collect();
        format!(
            "<ph block name=\"{}\">{}</ph name=\"{}\">",
            ph.start_name,
            children.join(", "),
            ph.close_name
        )
    }
}

// ============================================================================
// SHA1 Implementation
// ============================================================================

/// Compute the SHA1 of the given string.
///
/// See <https://csrc.nist.gov/publications/fips/fips180-4/fips-180-4.pdf>
///
/// WARNING: This function has not been designed or tested with security in mind.
/// DO NOT USE IT IN A SECURITY SENSITIVE CONTEXT.
#[expect(clippy::many_single_char_names, clippy::unreadable_literal)]
pub fn sha1(str: &str) -> String {
    let utf8 = str.as_bytes();
    let words32 = bytes_to_words32(utf8, Endian::Big);
    let len = utf8.len() * 8;

    let mut padded = words32;
    // Padding
    let idx = len >> 5;
    while padded.len() <= idx {
        padded.push(0);
    }
    padded[idx] |= 0x80 << (24 - (len % 32));

    let final_idx = (((len + 64) >> 9) << 4) + 15;
    while padded.len() <= final_idx {
        padded.push(0);
    }
    padded[final_idx] = len as u32;

    let mut w = [0u32; 80];
    let mut a: u32 = 0x67452301;
    let mut b: u32 = 0xefcdab89;
    let mut c: u32 = 0x98badcfe;
    let mut d: u32 = 0x10325476;
    let mut e: u32 = 0xc3d2e1f0;

    let mut i = 0;
    while i < padded.len() {
        let h0 = a;
        let h1 = b;
        let h2 = c;
        let h3 = d;
        let h4 = e;

        for j in 0..80 {
            if j < 16 {
                w[j] = if i + j < padded.len() { padded[i + j] } else { 0 };
            } else {
                w[j] = rol32(w[j - 3] ^ w[j - 8] ^ w[j - 14] ^ w[j - 16], 1);
            }

            let (f, k) = fk(j, b, c, d);
            let temp = add32_many(&[rol32(a, 5), f, e, k, w[j]]);
            e = d;
            d = c;
            c = rol32(b, 30);
            b = a;
            a = temp;
        }

        a = add32(a, h0);
        b = add32(b, h1);
        c = add32(c, h2);
        d = add32(d, h3);
        e = add32(e, h4);

        i += 16;
    }

    format!("{}{}{}{}{}", to_hex_u32(a), to_hex_u32(b), to_hex_u32(c), to_hex_u32(d), to_hex_u32(e))
}

/// Convert a number to an 8-character hex string.
fn to_hex_u32(value: u32) -> String {
    format!("{:08x}", value)
}

#[expect(clippy::unreadable_literal)]
fn fk(index: usize, b: u32, c: u32, d: u32) -> (u32, u32) {
    if index < 20 {
        ((b & c) | (!b & d), 0x5a827999)
    } else if index < 40 {
        (b ^ c ^ d, 0x6ed9eba1)
    } else if index < 60 {
        ((b & c) | (b & d) | (c & d), 0x8f1bbcdc)
    } else {
        (b ^ c ^ d, 0xca62c1d6)
    }
}

// ============================================================================
// Fingerprint Implementation
// ============================================================================

/// Compute the fingerprint of the given string.
///
/// The output is a 64-bit number encoded as a decimal string.
///
/// Based on:
/// <https://github.com/google/closure-compiler/blob/master/src/com/google/javascript/jscomp/GoogleJsMessageIdGenerator.java>
pub fn fingerprint(str: &str) -> u64 {
    let utf8 = str.as_bytes();

    let mut hi = hash32(utf8, 0);
    #[expect(clippy::unreadable_literal)]
    let mut lo = hash32(utf8, 102072);

    if hi == 0 && (lo == 0 || lo == 1) {
        #[expect(clippy::unreadable_literal)]
        {
            hi ^= 0x130f9bef;
            lo ^= 0x94a0a928u32; // -0x6b5f56d8 as u32 (two's complement)
        }
    }

    ((hi as u64) << 32) | (lo as u64)
}

/// Compute the message ID using fingerprint.
pub fn compute_msg_id(msg: &str, meaning: &str) -> String {
    let mut msg_fingerprint = fingerprint(msg);

    if !meaning.is_empty() {
        // Rotate the 64-bit fingerprint one bit to the left and add the meaning fingerprint
        msg_fingerprint = (msg_fingerprint << 1) | ((msg_fingerprint >> 63) & 1);
        msg_fingerprint = msg_fingerprint.wrapping_add(fingerprint(meaning));
    }

    // Return lower 63 bits as decimal string
    #[expect(clippy::unreadable_literal)]
    (msg_fingerprint & 0x7FFFFFFFFFFFFFFF).to_string()
}

#[expect(clippy::unreadable_literal)]
fn hash32(bytes: &[u8], mut c: u32) -> u32 {
    let mut a: u32 = 0x9e3779b9;
    let mut b: u32 = 0x9e3779b9;
    let mut index = 0;
    let length = bytes.len();

    let end = if length >= 12 { length - 12 } else { 0 };

    while index <= end && index + 11 < length {
        a = a.wrapping_add(get_u32_le(bytes, index));
        b = b.wrapping_add(get_u32_le(bytes, index + 4));
        c = c.wrapping_add(get_u32_le(bytes, index + 8));
        let (na, nb, nc) = mix(a, b, c);
        a = na;
        b = nb;
        c = nc;
        index += 12;
    }

    let remainder = length - index;

    // The first byte of c is reserved for the length
    c = c.wrapping_add(length as u32);

    if remainder >= 4 {
        a = a.wrapping_add(get_u32_le(bytes, index));
        index += 4;

        if remainder >= 8 {
            b = b.wrapping_add(get_u32_le(bytes, index));
            index += 4;

            // Partial 32-bit word for c
            if remainder >= 9 && index < length {
                c = c.wrapping_add((bytes[index] as u32) << 8);
                index += 1;
            }
            if remainder >= 10 && index < length {
                c = c.wrapping_add((bytes[index] as u32) << 16);
                index += 1;
            }
            if remainder == 11 && index < length {
                c = c.wrapping_add((bytes[index] as u32) << 24);
            }
        } else {
            // Partial 32-bit word for b
            if remainder >= 5 && index < length {
                b = b.wrapping_add(bytes[index] as u32);
                index += 1;
            }
            if remainder >= 6 && index < length {
                b = b.wrapping_add((bytes[index] as u32) << 8);
                index += 1;
            }
            if remainder == 7 && index < length {
                b = b.wrapping_add((bytes[index] as u32) << 16);
            }
        }
    } else {
        // Partial 32-bit word for a
        if remainder >= 1 && index < length {
            a = a.wrapping_add(bytes[index] as u32);
            index += 1;
        }
        if remainder >= 2 && index < length {
            a = a.wrapping_add((bytes[index] as u32) << 8);
            index += 1;
        }
        if remainder == 3 && index < length {
            a = a.wrapping_add((bytes[index] as u32) << 16);
        }
    }

    mix(a, b, c).2
}

fn mix(mut a: u32, mut b: u32, mut c: u32) -> (u32, u32, u32) {
    a = a.wrapping_sub(b);
    a = a.wrapping_sub(c);
    a ^= c >> 13;
    b = b.wrapping_sub(c);
    b = b.wrapping_sub(a);
    b ^= a << 8;
    c = c.wrapping_sub(a);
    c = c.wrapping_sub(b);
    c ^= b >> 13;
    a = a.wrapping_sub(b);
    a = a.wrapping_sub(c);
    a ^= c >> 12;
    b = b.wrapping_sub(c);
    b = b.wrapping_sub(a);
    b ^= a << 16;
    c = c.wrapping_sub(a);
    c = c.wrapping_sub(b);
    c ^= b >> 5;
    a = a.wrapping_sub(b);
    a = a.wrapping_sub(c);
    a ^= c >> 3;
    b = b.wrapping_sub(c);
    b = b.wrapping_sub(a);
    b ^= a << 10;
    c = c.wrapping_sub(a);
    c = c.wrapping_sub(b);
    c ^= b >> 15;
    (a, b, c)
}

fn get_u32_le(bytes: &[u8], index: usize) -> u32 {
    if index + 3 < bytes.len() {
        (bytes[index] as u32)
            | ((bytes[index + 1] as u32) << 8)
            | ((bytes[index + 2] as u32) << 16)
            | ((bytes[index + 3] as u32) << 24)
    } else {
        let mut result = 0u32;
        for i in 0..4 {
            if index + i < bytes.len() {
                result |= (bytes[index + i] as u32) << (i * 8);
            }
        }
        result
    }
}

// ============================================================================
// Utility Functions
// ============================================================================

#[derive(Clone, Copy)]
enum Endian {
    Big,
}

fn add32(a: u32, b: u32) -> u32 {
    a.wrapping_add(b)
}

fn add32_many(values: &[u32]) -> u32 {
    values.iter().fold(0u32, |acc, &v| acc.wrapping_add(v))
}

fn rol32(a: u32, count: u32) -> u32 {
    (a << count) | (a >> (32 - count))
}

fn bytes_to_words32(bytes: &[u8], endian: Endian) -> Vec<u32> {
    let size = (bytes.len() + 3) / 4;
    let mut words32 = Vec::with_capacity(size);

    for i in 0..size {
        words32.push(word_at(bytes, i * 4, endian));
    }

    words32
}

fn byte_at(bytes: &[u8], index: usize) -> u8 {
    if index >= bytes.len() { 0 } else { bytes[index] }
}

fn word_at(bytes: &[u8], index: usize, endian: Endian) -> u32 {
    let mut word = 0u32;
    match endian {
        Endian::Big => {
            for i in 0..4 {
                word += (byte_at(bytes, index + i) as u32) << (24 - 8 * i);
            }
        }
    }
    word
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sha1() {
        // Test vector from FIPS 180-4
        assert_eq!(sha1("abc"), "a9993e364706816aba3e25717850c26c9cd0d89d");
    }

    #[test]
    fn test_sha1_empty() {
        assert_eq!(sha1(""), "da39a3ee5e6b4b0d3255bfef95601890afd80709");
    }

    #[test]
    fn test_fingerprint() {
        // Basic fingerprint test
        let fp = fingerprint("Hello");
        assert!(fp > 0);
    }

    #[test]
    fn test_compute_msg_id() {
        let id = compute_msg_id("Hello World", "");
        assert!(!id.is_empty());

        // With meaning should produce different ID
        let id_with_meaning = compute_msg_id("Hello World", "greeting");
        assert_ne!(id, id_with_meaning);
    }

    #[test]
    fn test_compute_msg_id_deterministic() {
        let id1 = compute_msg_id("Test message", "meaning");
        let id2 = compute_msg_id("Test message", "meaning");
        assert_eq!(id1, id2);
    }
}
