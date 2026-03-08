/**
 * Little Green Dog — Mixpanel Custom Pixel
 *
 * Install: Shopify Admin → Settings → Customer Events → Add Custom Pixel
 * Paste the entire contents of this file into the pixel editor.
 *
 * What it does:
 *  1. Loads the Mixpanel JS SDK from CDN (npm is not available in pixels).
 *  2. Reads the `_mp_distinct_id` cart attribute set by our landing page,
 *     then calls mixpanel.identify() so checkout events are merged with the
 *     visitor's landing-page session in Mixpanel.
 *  3. Subscribes to Shopify's standard checkout events and forwards them to
 *     Mixpanel with rich properties.
 */

const MIXPANEL_TOKEN = 'cc67318fe82b66a1b37843f09348fa4b';

// ─── Load Mixpanel SDK (standard snippet, minified) ──────────────────────────
(function (f, b) {
  if (!b.__SV) {
    var e, g, i, h;
    window.mixpanel = b;
    b._i = [];
    b.init = function (a, c, d) {
      function f(b, h) {
        var a = h.split('.');
        2 == a.length && ((b = b[a[0]]), (h = a[1]));
        b[h] = function () {
          b.push([h].concat(Array.prototype.slice.call(arguments, 0)));
        };
      }
      var g = b;
      'undefined' !== typeof d ? (g = b[d] = []) : (d = 'mixpanel');
      g.people = g.people || [];
      g.toString = function (b) {
        var a = 'mixpanel';
        'mixpanel' !== d && (a += '.' + d);
        b || (a += ' (stub)');
        return a;
      };
      g.people.toString = function () {
        return g.toString(1) + '.people (stub)';
      };
      i = 'disable time_event track track_pageview track_links track_forms track_with_groups add_group set_group remove_group register register_once alias unregister identify name_tag set_config reset opt_in_tracking opt_out_tracking has_opted_in_tracking has_opted_out_tracking clear_opt_in_out_tracking start_batch_senders people.set people.set_once people.unset people.increment people.append people.union people.track_charge people.clear_charges people.delete_user people.remove'.split(' ');
      for (h = 0; h < i.length; h++) f(g, i[h]);
      var j = 'set set_once union unset remove delete'.split(' ');
      g.get_group = function () {
        function a(c) {
          b[c] = function () {
            call2_args = arguments;
            call2 = [c].concat(Array.prototype.slice.call(call2_args, 0));
            g.push([a_c].concat([call2]));
          };
        }
        for (
          var b = {}, c = ['get_group'].concat(Array.prototype.slice.call(arguments, 0)), a_c = c.join('.'), d = 0;
          d < j.length;
          d++
        )
          a(j[d]);
        return b;
      };
      b._i.push([a, c, d]);
    };
    b.__SV = 1.2;
    e = f.createElement('script');
    e.type = 'text/javascript';
    e.async = !0;
    e.src = (typeof MIXPANEL_CUSTOM_LIB_URL !== 'undefined') ? MIXPANEL_CUSTOM_LIB_URL : 'https://cdn.mxpnl.com/libs/mixpanel-2-latest.min.js';
    g = f.getElementsByTagName('script')[0];
    g.parentNode.insertBefore(e, g);
  }
})(document, window.mixpanel || []);

mixpanel.init(MIXPANEL_TOKEN, { persistence: 'localStorage' });

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Reads _mp_distinct_id from the checkout's customAttributes and calls
 * mixpanel.identify() so this session merges with the landing-page profile.
 */
function identifyFromCheckout(checkout) {
  if (!checkout) return;
  const attrs = checkout.customAttributes || [];
  const attr = attrs.find(function (a) { return a.key === '_mp_distinct_id'; });
  if (attr && attr.value) {
    mixpanel.identify(attr.value);
  }
}

/** Returns a flat array of line-item objects suitable for Mixpanel properties. */
function serializeLineItems(lineItems) {
  if (!lineItems) return [];
  return lineItems.map(function (item) {
    return {
      product_id: item.variant && item.variant.product ? item.variant.product.id : null,
      variant_id: item.variant ? item.variant.id : null,
      product_title: item.title || null,
      quantity: item.quantity || 1,
      price: item.variant && item.variant.price ? item.variant.price.amount : null,
      currency: item.variant && item.variant.price ? item.variant.price.currencyCode : null,
      sku: item.variant ? item.variant.sku : null,
    };
  });
}

// ─── Checkout event subscriptions ─────────────────────────────────────────────

analytics.subscribe('checkout_started', function (event) {
  var checkout = event.data.checkout;
  identifyFromCheckout(checkout);
  mixpanel.track('Checkout Step Viewed', {
    step: 1,
    step_name: 'Checkout Started',
    currency: checkout.currencyCode,
    total_price: checkout.totalPrice && checkout.totalPrice.amount,
    item_count: checkout.lineItems ? checkout.lineItems.length : 0,
    line_items: serializeLineItems(checkout.lineItems),
  });
});

analytics.subscribe('checkout_contact_info_submitted', function (event) {
  var checkout = event.data.checkout;
  identifyFromCheckout(checkout);
  mixpanel.track('Checkout Step Completed', {
    step: 2,
    step_name: 'Contact Info',
  });
});

analytics.subscribe('checkout_address_info_submitted', function (event) {
  var checkout = event.data.checkout;
  identifyFromCheckout(checkout);
  mixpanel.track('Checkout Step Completed', {
    step: 3,
    step_name: 'Address',
  });
});

analytics.subscribe('checkout_shipping_info_submitted', function (event) {
  var checkout = event.data.checkout;
  identifyFromCheckout(checkout);
  var shippingLine = checkout.shippingLine;
  mixpanel.track('Checkout Step Completed', {
    step: 4,
    step_name: 'Shipping',
    shipping_method: shippingLine ? shippingLine.title : null,
    shipping_price: shippingLine && shippingLine.price ? shippingLine.price.amount : null,
  });
});

analytics.subscribe('payment_info_submitted', function (event) {
  var checkout = event.data.checkout;
  identifyFromCheckout(checkout);
  mixpanel.track('Checkout Step Completed', {
    step: 5,
    step_name: 'Payment Info',
  });
});

analytics.subscribe('checkout_completed', function (event) {
  var checkout = event.data.checkout;
  identifyFromCheckout(checkout);

  var orderTotal = checkout.totalPrice ? parseFloat(checkout.totalPrice.amount) : 0;

  // Standard Mixpanel revenue tracking
  mixpanel.people.track_charge(orderTotal);

  mixpanel.track('Purchase Completed', {
    // Revenue
    revenue: orderTotal,
    currency: checkout.currencyCode,
    subtotal: checkout.subtotalPrice ? parseFloat(checkout.subtotalPrice.amount) : null,
    tax: checkout.totalTax ? parseFloat(checkout.totalTax.amount) : null,

    // Order identifiers
    order_id: checkout.order ? checkout.order.id : null,
    order_number: checkout.order ? checkout.order.orderNumber : null,

    // Items
    item_count: checkout.lineItems ? checkout.lineItems.length : 0,
    line_items: serializeLineItems(checkout.lineItems),

    // Source attribution
    source: 'shopify_pixel',
  });
});
