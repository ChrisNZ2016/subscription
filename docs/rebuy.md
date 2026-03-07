# Rebuy Developer Documentation

> Developer documentation for Rebuy - personalization and merchandising for Shopify

Rebuy is a personalization and merchandising platform for Shopify stores.
This documentation covers the JavaScript SDK, REST API, Smart Cart, Widgets,
Smart Flows, and integrations with Shopify Hydrogen, ReCharge, Meta Shops, and more.

For the complete documentation in a single file, see: /llms-full.txt (1143.7KB)
- [Home](https://developers.rebuyengine.com/index.md) (6.1KB): <div class="hero" markdown>

## Guides


### Documentation

- [Getting Started with Rebuy](https://developers.rebuyengine.com/guides/getting-started.md) (2.5KB): This page will help you get started with Rebuy. You'll be up and running in a jiffy!
- [Rebuy Connector](https://developers.rebuyengine.com/guides/rebuy-connector.md) (4.8KB): Shopify App Embed that enables advanced Rebuy features by outputting Liquid directly within your theme.
- [AI Integration Guide](https://developers.rebuyengine.com/guides/ai-integration.md) (6.6KB): Use llms.txt to give AI assistants full context on Rebuy's APIs, events, and templates. Works with Claude, ChatGPT, and other LLMs.

### Smart Cart Apps

- [Building Your Smart Cart App](https://developers.rebuyengine.com/guides/building-your-smartcart-app.md) (2.6KB): Create and deploy custom apps for the Smart Cart platform
- [Adjusting Merchant Visibility for Your App](https://developers.rebuyengine.com/guides/adjusting-merchant-visibility-for-your-app.md) (2.5KB): Make your Smart Cart app visible to specific merchant stores

## API Reference


### Platform Data Sources

- [Recommended](https://developers.rebuyengine.com/reference/recommended.md) (5.1KB): Returns a list of the highest converting cross-sell products based on the given inputs.
- [Top Sellers](https://developers.rebuyengine.com/reference/top-sellers.md) (4.4KB): Fetch top selling products based on sales data
- [Trending Products](https://developers.rebuyengine.com/reference/trending-products.md) (4.4KB): Fetch trending products based on recent sales data
- [Purchased](https://developers.rebuyengine.com/reference/purchased.md) (16.4KB): Returns a list of the highest converting cross-sell products based on the given inputs.
- [Collections](https://developers.rebuyengine.com/reference/collections.md) (6.4KB): Returns a list of products from the given collections.
- [Viewed](https://developers.rebuyengine.com/reference/viewed.md) (14.5KB): Returns a list of products viewed by a user.
- [Static](https://developers.rebuyengine.com/reference/static.md) (9.6KB): Returns a static list of products to recommend based on the given ids.
- [Similar Products](https://developers.rebuyengine.com/reference/similar-products.md) (10.6KB): Returns products that are similar.
- [Complementary to Viewed](https://developers.rebuyengine.com/reference/complementary-to-viewed.md) (14.5KB): Returns a list of products complementary to those viewed by a user.

### Data Sources : Widgets

- [Custom Endpoints](https://developers.rebuyengine.com/reference/api-custom-endpoints.md) (24.0KB): Returns a personalized list of products based on the given query parameter.
- [All Sources](https://developers.rebuyengine.com/reference/sources.md) (2.8KB): Returns a list of available data sources for the given merchant.
- [Widget Settings](https://developers.rebuyengine.com/reference/widget-settings-url.md) (1.7KB): Returns all settings for a given widget.

### Rebuy Analytics

- [Event](https://developers.rebuyengine.com/reference/analytics-event.md) (3.1KB): Logs analytics data from customers who view products.
- [Rebuy Analytic 2.0 Endpoints](https://developers.rebuyengine.com/reference/rebuy-analytic-v2-endpoints.md) (4.0KB): Endpoints for creating analytics for use in Rebuy tools such as the Recently Viewed widget.

### JavaScript


#### Rebuy JS Overview

- [Overview](https://developers.rebuyengine.com/reference/rebuy-js-overview.md) (921B): Front-end JavaScript library powering Rebuy widgets and tracking
- [Automatic Installation](https://developers.rebuyengine.com/reference/automatic-installation.md) (1.1KB): Load Rebuy.JS automatically through the Shopify app
- [Manual Installation](https://developers.rebuyengine.com/reference/manual-installation.md) (1.8KB): Install Rebuy.JS manually in your theme for faster load times
- [Event Listeners](https://developers.rebuyengine.com/reference/event-listeners.md) (6.5KB): Overview of the Rebuy event system and links to all event listener documentation
- [Templates](https://developers.rebuyengine.com/reference/templates.md) (2.1KB): Customize Vue.js templates for widgets and Smart Cart

#### Cart

- [Cart Overview](https://developers.rebuyengine.com/reference/cart.md) (1.1KB): Manages Rebuy cart object
- [Methods](https://developers.rebuyengine.com/reference/cart-methods.md) (11.0KB): Below is a list of Rebuy's cart based methods.
- [Event Listeners](https://developers.rebuyengine.com/reference/cart-event-listeners.md) (2.7KB): Listen for cart ready, add, change, and enriched events

#### Smart Cart

- [Smart Cart Overview](https://developers.rebuyengine.com/reference/smart-cart.md) (3.5KB): Integrate Rebuy's cart drawer solution with product tags and cross-sell capabilities
- [Settings](https://developers.rebuyengine.com/reference/smart-cart-settings.md) (11.7KB): Configure cart drawer appearance, upsell widgets, and checkout behavior
- [Event Listeners](https://developers.rebuyengine.com/reference/smart-cart-event-listeners.md) (4.4KB): Handle cart lifecycle events and trigger custom logic with JavaScript
- [Smart Cart Custom Template](https://developers.rebuyengine.com/reference/smart-cart-custom-template.md) (39.3KB): Build a fully customized cart drawer using Vue.js templates
- [URL Argument](https://developers.rebuyengine.com/reference/url-argument.md) (548B): Open Smart Cart on page load with URL parameters
- [Methods - Legacy](https://developers.rebuyengine.com/reference/smart-cart-methods-legacy.md) (9.9KB): Legacy JavaScript methods for Smart Cart integration

##### Smart Cart Methods

- [Overview](https://developers.rebuyengine.com/reference/smart-cart-methods.md) (1.3KB): Methods for the new Smart Cart
- [Base Methods](https://developers.rebuyengine.com/reference/smart-cart-methods-base.md) (5.6KB): Core JavaScript methods for controlling Smart Cart display and state
- [Announcement Bar Methods](https://developers.rebuyengine.com/reference/smart-cart-methods-announcement-bar.md) (1.5KB): Access and manage announcement bar instances in Smart Cart
- [Bundle Product Methods](https://developers.rebuyengine.com/reference/smart-cart-methods-bundle-product.md) (2.0KB): Display and manage Shopify bundle products in the cart
- [Buy More Save More Methods](https://developers.rebuyengine.com/reference/smart-cart-methods-buy-more-save-more.md) (2.3KB): Implement quantity-based discount tiers for products
- [Cart Items Methods](https://developers.rebuyengine.com/reference/smart-cart-methods-cart-items.md) (8.1KB): Manage line items, quantities, and discounts programmatically
- [Checkout Area Methods](https://developers.rebuyengine.com/reference/smart-cart-methods-checkout-area.md) (4.7KB): Control checkout buttons, terms, and payment options
- [Cross-Sell Widget Methods](https://developers.rebuyengine.com/reference/smart-cart-methods-cross-sell-widget.md) (1.9KB): Access and manage cross-sell widget IDs and settings
- [Discount Code Input Methods](https://developers.rebuyengine.com/reference/smart-cart-methods-discount-code-input.md) (3.6KB): Apply and validate discount codes in the cart drawer
- [Login Link Methods](https://developers.rebuyengine.com/reference/smart-cart-methods-login.md) (855B): Display login prompts for guest customers in the cart
- [Order Notes Methods](https://developers.rebuyengine.com/reference/smart-cart-methods-order-notes.md) (2.1KB): Enable customer order notes with character limits
- [Smart Cart App Methods](https://developers.rebuyengine.com/reference/smart-cart-methods-smart-cart-apps.md) (1.1KB): Inject and manage third-party app scripts in Smart Cart
- [Subtotal Methods](https://developers.rebuyengine.com/reference/smart-cart-methods-subtotal.md) (1.7KB): Access and format cart subtotal values
- [Switch to Subscription Methods](https://developers.rebuyengine.com/reference/smart-cart-methods-switch-to-subscription.md) (3.3KB): Convert one-time purchases to subscriptions in cart
- [Tiered Progress Bar Methods](https://developers.rebuyengine.com/reference/smart-cart-methods-tiered-progress-bar.md) (12.0KB): Control free gift tiers, progress tracking, and rewards
- [Title Methods](https://developers.rebuyengine.com/reference/smart-cart-methods-title.md) (717B): Customize the cart drawer header title

#### Smart Flows

- [Smart Flows Methods](https://developers.rebuyengine.com/reference/smart-flows-methods.md) (6.0KB): Create dynamic, rule-based customer engagement flows with popups, banners, and targeted offers
- [Smart Flows Session](https://developers.rebuyengine.com/reference/smart-flows-methods-session.md) (4.2KB): Manage Smart Flows session persistence and component states

#### Widgets

- [Widgets Overview](https://developers.rebuyengine.com/reference/widgets.md) (1.6KB): Display product recommendations with Vue.js-powered widgets
- [Settings](https://developers.rebuyengine.com/reference/widget-settings.md) (7.5KB): Configure widget layout, placement, discounts, and integrations
- [Attributes](https://developers.rebuyengine.com/reference/widget-attributes.md) (1.6KB): Track widget-attributed sales with product properties
- [Methods](https://developers.rebuyengine.com/reference/widget-methods.md) (10.8KB): JavaScript methods for controlling widget display and cart interactions
- [Event Listeners](https://developers.rebuyengine.com/reference/widget-event-listeners.md) (7.9KB): Handle widget lifecycle events for custom functionality
- [Widget Custom Templates](https://developers.rebuyengine.com/reference/widget-custom-templates.md) (111.1KB): Build custom Vue.js templates for complete widget control

#### Bundle Builder

- [Custom Template](https://developers.rebuyengine.com/reference/bundle-builder-custom-template.md) (55.6KB): Build custom Vue.js templates for Bundle Builder widgets
- [Event Listeners](https://developers.rebuyengine.com/reference/bundle-builder-event-listeners.md) (2.1KB): Handle Bundle Builder widget events for product and cart actions

#### Utilities

- [Utilities Overview](https://developers.rebuyengine.com/reference/utilities.md) (740B): Helpful Methods
- [Methods](https://developers.rebuyengine.com/reference/utility-methods.md) (17.8KB): Helper functions for formatting, products, objects, and common operations

#### Smart Links

- [Smart Links Overview](https://developers.rebuyengine.com/reference/smart-links.md) (2.7KB): Create pre-built cart URLs for email campaigns and promotions
- [URL Arguments](https://developers.rebuyengine.com/reference/url-arguments.md) (6.0KB): Build Smart Link URLs with cart, redirect, and discount parameters
- [Smart Banner](https://developers.rebuyengine.com/reference/smart-banner.md) (3.7KB): Display promotional messages via Smart Links with a dismissible banner

#### Shopify Selling Plans

- [Shopify Selling Plans Overview](https://developers.rebuyengine.com/reference/shopify-selling-plans.md) (617B): Enable subscription selling plans with Shopify and Rebuy
- [Enable Selling Plans](https://developers.rebuyengine.com/reference/enable-selling-plans.md) (4.2KB): Configure subscription selling plans from all supported providers

#### Smart Search

- [Event Listeners](https://developers.rebuyengine.com/reference/smart-search-event-listeners.md) (8.1KB): Handle Quick View and Results Page search events
- [Settings Methods](https://developers.rebuyengine.com/reference/smart-search-settings-methods.md) (932B): Access Quick View and Combined Search settings programmatically

##### Custom Templates

- [Quick View](https://developers.rebuyengine.com/reference/quick-view.md) (83.0KB): Customize Quick View search with dropdown and flyout templates
- [Quick View Methods](https://developers.rebuyengine.com/reference/quick-view-methods.md) (7.3KB): JavaScript methods for controlling Quick View search behavior
- [Results Page](https://developers.rebuyengine.com/reference/results-page.md) (237.1KB): Customize search results page with dropdown and fullscreen templates
- [Results Page Methods](https://developers.rebuyengine.com/reference/results-page-methods.md) (2.0KB): Control search results filtering, sorting, and display

#### Modal

- [Modal Custom Templates](https://developers.rebuyengine.com/reference/modal-custom-templates.md) (8.3KB): Customize modal behavior with Vue.js templates for variant selection and notification dialogs. Override default modal layouts with custom HTML and JavaScript functionality.

#### Landing Pages

- [Event Listeners](https://developers.rebuyengine.com/reference/landing-pages-event-listeners.md) (4.2KB): Handle Reorder and Reactivate Landing Page lifecycle events
- [Icons](https://developers.rebuyengine.com/reference/icons.md) (7.5KB): Rebuy's icon system documentation covering the migration from Font Awesome to Lucide-based icons. Includes usage examples, console helpers, and styling guidelines.

### Headless SDKs

- [Core SDK](https://developers.rebuyengine.com/reference/headless-core-sdk.md) (7.4KB): Core SDK for Rebuy headless integrations. Framework-agnostic foundation for recommendations, cart, and analytics.
- [Hydrogen SDK](https://developers.rebuyengine.com/reference/headless-hydrogen-sdk.md) (14.3KB): React/Hydrogen SDK for Rebuy. Components and hooks for Shopify Hydrogen storefronts.

### Experiments JS

- [Overview](https://developers.rebuyengine.com/reference/experiments-overview.md) (1.5KB): A/B test Smart Cart and widgets with testing platforms
- [Methods](https://developers.rebuyengine.com/reference/experiments-methods.md) (1.7KB): Run experiments and apply settings changes with JavaScript
- [Examples](https://developers.rebuyengine.com/reference/experiments-examples.md) (4.2KB): Example experiments for Smart Cart, widgets, and discounts

### Storefront Helper

- [Overview](https://developers.rebuyengine.com/reference/shopifystorefront-helper-overview.md) (844B): Fetch locale-aware storefront data for Rebuy widgets
- [Methods](https://developers.rebuyengine.com/reference/shopifystorefront-helper-methods.md) (609B): Update product JSON with market-specific translations
- [Examples](https://developers.rebuyengine.com/reference/shopifystorefront-helper-examples.md) (1.4KB): Translate product titles in widgets with Shopify Markets

### Shopify Permalinks

- [Overview](https://developers.rebuyengine.com/reference/shopify-permalinks-introduction.md) (1.6KB): Create Cart-backed Shopify checkouts for headless storefronts
- [Methods](https://developers.rebuyengine.com/reference/shopify-permalinks-methods.md) (3.6KB): Configure checkout URLs with discounts and customer data
- [Examples](https://developers.rebuyengine.com/reference/shopify-permalinks-examples.md) (3.9KB): Auto-apply discounts and pre-populate checkout fields

### Meta Shops

- [Recommended](https://developers.rebuyengine.com/reference/meta-shops-recommended.md) (1.3KB): Rebuy works with Meta Shops to enable powerful, high converting, product recommendations.
- [Storefront Trending](https://developers.rebuyengine.com/reference/meta-storefront-trending.md) (1.4KB): Rebuy works with Meta Shops to enable powerful, high converting, product recommendations.
- [Collection Trending](https://developers.rebuyengine.com/reference/meta-collection-trending.md) (1.5KB): Rebuy works with Meta Shops to enable powerful, high converting, product recommendations.

### Rebuy + Tapcart

- [Tapcart Custom Screen](https://developers.rebuyengine.com/reference/tapcart-custom-screen.md) (3.8KB): Learn how to create custom screens within the Tapcart app to provide a seamless mobile shopping experience and integrate Rebuy's Dynamic Bundle widget for bundling products.

### Rebuy Smart Search

- [Search](https://developers.rebuyengine.com/reference/smart-search.md) (6.1KB): AI-powered product search with instant results, filters, and faceted navigation
- [QuickView Search](https://developers.rebuyengine.com/reference/quickview-search.md) (3.2KB): The Quickview API provides product autocomplete suggestions based on a user query.

### Rebuy Smart Collections

- [Smart Collections Overview](https://developers.rebuyengine.com/reference/smart-collections.md) (2.6KB): Personalized collection merchandising with filtering, sorting, and custom templates

#### Custom Templates

- [Overview](https://developers.rebuyengine.com/reference/smart-collections-custom-templates.md) (1.5KB): Customize Smart Collections layout and functionality with Vue.js templates
- [Dropdown Template](https://developers.rebuyengine.com/reference/smart-collections-dropdown-template.md) (64.6KB): Smart Collections template with collapsible filter dropdowns above the product grid
- [Sidebar Template](https://developers.rebuyengine.com/reference/smart-collections-sidebar-template.md) (101.8KB): Smart Collections template with persistent sidebar filters next to the product grid
- [Event Listeners](https://developers.rebuyengine.com/reference/smart-collections-event-listeners.md) (5.3KB): Listen for Smart Collections initialization, product add, view, and collection change events
- [Active Settings](https://developers.rebuyengine.com/reference/smart-collections-active-setting.md) (20.2KB): Retrieves the active Smart Collections settings for a given shop, applying campaign settings if a campaign is active or individual collection settings otherwise. This endpoint provides the currentl...
- [Product List](https://developers.rebuyengine.com/reference/smart-collections-product-list.md) (5.3KB): Returns a list of products for a Smart Collection based on the given parameters in the request body. Only products within the specified collection are returned. The request body must be sent as a J...
