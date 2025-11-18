# Image Alt Text Guidelines for Destino SF

**Purpose:** Ensure all images on the Destino SF website have proper alt text for accessibility (WCAG 2.1 compliance) and SEO optimization.

**Last Updated:** 2025-11-06
**Current Score:** 3.6% (needs improvement)

---

## Why Alt Text Matters

1. **Accessibility:** Screen readers depend on alt text to describe images to visually impaired users
2. **SEO:** Search engines use alt text to understand image content and improve rankings
3. **User Experience:** Alt text displays when images fail to load
4. **Legal Compliance:** Required for WCAG 2.1 Level A accessibility standards

---

## General Principles

### ✅ DO

- **Be descriptive and specific:** Describe what's in the image, not what you think about it
- **Keep it concise:** Aim for 125 characters or less (screen readers may cut off longer text)
- **Provide context:** Consider where the image appears and what information it conveys
- **Use proper grammar:** Write in complete sentences when appropriate
- **Include brand name when relevant:** "Destino SF chocolate alfajores" not just "alfajores"
- **Describe important text in images:** If an image contains text, include it in alt text

### ❌ DON'T

- **Use generic descriptions:** Avoid "image", "photo", "picture", "product", "icon"
- **Start with "image of" or "picture of":** Screen readers already announce it's an image
- **Include file names:** "IMG_1234.jpg" provides no value
- **Use ALL CAPS:** It can sound like shouting to screen readers
- **Repeat surrounding text:** Alt text should add information, not duplicate it
- **Include decorative details:** Focus on meaningful content

---

## Product-Specific Guidelines

### Product Images

**Format:** `[Product Name] - [Key Distinguishing Feature]`

**Examples:**

✅ **Good:**

```tsx
<Image src="/images/empanadas/beef.jpg" alt="Argentine beef empanada with golden flaky crust" />
```

```tsx
<Image
  src="/images/alfajores/chocolate.jpg"
  alt="Chocolate alfajores with dulce de leche filling"
/>
```

❌ **Bad:**

```tsx
alt = 'product';
alt = 'image of empanada';
alt = 'photo';
alt = ''; // Only acceptable for purely decorative images
```

### Category Images

**Format:** `[Category Name] collection - [Brief Description]`

**Examples:**

```tsx
<Image
  src="/images/categories/alfajores.jpg"
  alt="Alfajores collection - handcrafted dulce de leche cookies"
/>
```

```tsx
<Image
  src="/images/categories/empanadas.jpg"
  alt="Empanadas collection - Latin American savory pastries"
/>
```

### Catering Images

**Format:** `[Service/Package Name] - [Context/Setting]`

**Examples:**

```tsx
<Image
  src="/images/catering/event-setup.jpg"
  alt="Catering spread with empanadas and alfajores at corporate event"
/>
```

```tsx
<Image
  src="/images/catering/boxed-lunch.jpg"
  alt="Boxed lunch package with empanadas, side salad, and dessert"
/>
```

---

## Component-Specific Guidelines

### Logo Images

**Navbar/Header:**

```tsx
<Image src="/logo.png" alt="Destino SF - Handcrafted Latin Food" />
```

**Footer:**

```tsx
<Image src="/logo.png" alt="Destino SF logo" />
```

### Hero/Banner Images

**Format:** Describe the scene and convey the message

**Examples:**

```tsx
<Image
  src="/hero-banner.jpg"
  alt="Fresh empanadas and alfajores displayed on rustic wooden board"
/>
```

```tsx
<Image src="/catering-hero.jpg" alt="Elegant catering setup with assorted empanadas and desserts" />
```

### Promotional/Marketing Images

**Format:** Include the offer and key visual elements

**Examples:**

```tsx
<Image src="/promo-mothers-day.jpg" alt="Mother's Day special - alfajores gift box with ribbon" />
```

```tsx
<Image src="/featured-bundle.jpg" alt="Featured bundle: 12 empanadas and 6 alfajores" />
```

### About/Team Images

**Format:** Name and role (if people), or description of location/process

**Examples:**

```tsx
<Image src="/team/chef.jpg" alt="Head chef preparing empanada dough in Destino SF kitchen" />
```

```tsx
<Image
  src="/about/kitchen.jpg"
  alt="Destino SF commercial kitchen with traditional baking equipment"
/>
```

---

## Special Cases

### Decorative Images

**When to use empty alt text (`alt=""`):**

- Pure design elements (borders, dividers, backgrounds)
- Images that add no informational value
- Images fully described in adjacent text

**Example:**

```tsx
{
  /* Decorative background pattern */
}
<Image src="/pattern-bg.svg" alt="" aria-hidden="true" />;
```

### Icons

**Functional icons (clickable):** Describe the action

```tsx
<Image src="/icons/cart.svg" alt="View shopping cart" />
```

**Decorative icons (next to text):** Use empty alt or aria-hidden

```tsx
<ShoppingCart className="w-5 h-5" aria-hidden="true" />
<span>Shopping Cart</span>
```

### Image Galleries/Carousels

**First image:** Full descriptive alt text
**Subsequent images:** "Alternative view of [product]"

```tsx
<Image src="/empanada-1.jpg" alt="Argentine beef empanada with golden crust" />
<Image src="/empanada-2.jpg" alt="Argentine beef empanada cross-section showing beef filling" />
<Image src="/empanada-3.jpg" alt="Argentine beef empanada on serving plate" />
```

### Product Thumbnails in Lists

**Format:** Just product name (context is provided by surrounding UI)

```tsx
<Image src="/thumb/beef-empanada.jpg" alt="Argentine beef empanada" />
```

---

## Testing Your Alt Text

### Quick Self-Check

1. **Close your eyes:** Have someone read the alt text aloud. Can you visualize the image?
2. **Cover the image:** Does the alt text convey the essential information?
3. **Length check:** Is it under 125 characters?
4. **Uniqueness check:** Does each image have unique alt text (no duplicates)?

### Automated Testing

Run the audit script regularly:

```bash
node scripts/audit-image-alt.js
```

Review the generated report at `docs/IMAGE_ALT_AUDIT_REPORT.md`

### Manual Testing with Screen Readers

- **macOS:** VoiceOver (Cmd+F5)
- **Windows:** NVDA (free) or JAWS
- **Chrome:** Install ChromeVox extension

---

## Priority Order for Fixes

Based on customer visibility and SEO impact:

1. **Critical (Fix First):**
   - Homepage hero/banner images
   - Product images on product detail pages
   - Product images on category pages
   - Logo in navbar
   - Featured/spotlight product images

2. **High Priority:**
   - Catering page images
   - About page team/kitchen images
   - Product thumbnails in shopping cart
   - Category header images
   - Promotional banners

3. **Medium Priority:**
   - Admin dashboard images (internal use)
   - Image placeholders
   - Secondary product views
   - Email template images

4. **Low Priority:**
   - Decorative backgrounds (consider using `alt=""`)
   - Pure design elements
   - Icons with adjacent text labels

---

## Implementation Checklist

When adding a new image to the codebase:

- [ ] Is this image informational or decorative?
- [ ] If informational, does it have descriptive alt text?
- [ ] Is the alt text under 125 characters?
- [ ] Does it avoid starting with "image of" or "picture of"?
- [ ] Does it describe the content, not the file?
- [ ] Is it specific to the product/content (not generic)?
- [ ] If decorative, does it use `alt=""` and `aria-hidden="true"`?

---

## Resources

- **WCAG 2.1 Image Requirements:** https://www.w3.org/WAI/WCAG21/Understanding/non-text-content.html
- **WebAIM Alt Text Guide:** https://webaim.org/techniques/alttext/
- **Google Image SEO Best Practices:** https://developers.google.com/search/docs/appearance/google-images

---

## Review Schedule

- **Monthly:** Run automated audit script
- **Quarterly:** Manual review of top-performing product pages
- **Before major releases:** Full accessibility audit including alt text
- **When adding new products:** Ensure proper alt text from the start

---

**Questions?** Contact the development team or refer to the accessibility section in `CLAUDE.md`
