/**
 * Central template registry.
 *
 * Every storefront route resolves its components via `getTemplate(templateId)`
 * instead of maintaining its own inline dispatch map. Adding a new template
 * only requires updating this file.
 *
 * Merge strategy: `getTemplate` spreads the `default` entry over the requested
 * template, so any slot not provided by a partial template automatically falls
 * back to the default implementation.
 */

import type { ComponentType } from "react";

// ---------------------------------------------------------------------------
// Bamboo
// ---------------------------------------------------------------------------
import { BambooAboutPage } from "./bamboo/about/bamboo-about-page";
import { BambooAccountSecurityPage } from "./bamboo/account/bamboo-account-security-page";
import { BambooAccountSettingsPage } from "./bamboo/account/bamboo-account-settings-page";
import { BambooAddressBookPage } from "./bamboo/account/bamboo-address-book-page";
import { BambooOrderDetailPage } from "./bamboo/account/bamboo-order-detail-page";
import { BambooOrdersPage } from "./bamboo/account/bamboo-orders-page";
import { BambooPreferencesPage } from "./bamboo/account/bamboo-preferences-page";
import { BambooGenericPage } from "./bamboo/bamboo-generic-page";
import { BambooBlogPage } from "./bamboo/blog/bamboo-blog-page";
import { BambooBlogPostPage } from "./bamboo/blog/bamboo-blog-post-page";
import { BambooCartPage } from "./bamboo/cart-checkout/bamboo-cart-page";
import { BambooCheckoutPage } from "./bamboo/cart-checkout/bamboo-checkout-page";
import { BambooOrderSuccessPage } from "./bamboo/cart-checkout/bamboo-order-success-page";
import { BambooCollectionPage } from "./bamboo/collections/bamboo-collection-page";
import { BambooCollectionsPage } from "./bamboo/collections/bamboo-collections-page";
import { BambooContactPage } from "./bamboo/contact/bamboo-contact-page";
import { BambooLayout } from "./bamboo/layout/bamboo-general-layout";
import { BambooProductPage } from "./bamboo/products/bamboo-product-page";
import { BambooShopPage } from "./bamboo/shop/bamboo-shop-page";
import { BambooTestimonialsPage } from "./bamboo/testimonials/bamboo-testimonials-page";
import { BuildersAboutPage } from "./builders/about/builders-about-page";
import { BuildersGenericPage } from "./builders/builders-generic-page";
import { BuildersContactPage } from "./builders/contact/builders-contact-page";
// ---------------------------------------------------------------------------
// Builders
// ---------------------------------------------------------------------------
import { BuildersLayout } from "./builders/layout/builders-layout";
import { BuildersServicesIndexPage } from "./builders/services/builders-services-index-page";
import { BuildersTestimonialsPage } from "./builders/testimonials/builders-testimonials-page";
// ---------------------------------------------------------------------------
// Coop
// ---------------------------------------------------------------------------
import { CoopAboutPage } from "./coop/about/coop-about-page";
import { CoopContactPage } from "./coop/contact/coop-contact-page";
import { CoopGenericPage } from "./coop/generic/coop-generic-page";
import { CoopLayout } from "./coop/layout/coop-layout";
// ---------------------------------------------------------------------------
// Dark Trend
// ---------------------------------------------------------------------------
import { DarkTrendAboutPage } from "./dark-trend/about/dark-trend-about-page";
import { DarkTrendAccountSecurityPage } from "./dark-trend/account/dark-trend-account-security-page";
import { DarkTrendAccountSettingsPage } from "./dark-trend/account/dark-trend-account-settings-page";
import { DarkTrendAddressBookPage } from "./dark-trend/account/dark-trend-address-book-page";
import { DarkTrendOrderDetailPage } from "./dark-trend/account/dark-trend-order-detail-page";
import { DarkTrendOrdersPage } from "./dark-trend/account/dark-trend-orders-page";
import { DarkTrendPreferencesPage } from "./dark-trend/account/dark-trend-preferences-page";
import { DarkTrendBlogPage } from "./dark-trend/blog/dark-trend-blog-page";
import { DarkTrendBlogPostPage } from "./dark-trend/blog/dark-trend-blog-post-page";
import { DarkTrendCartPage } from "./dark-trend/cart-checkout/dark-trend-cart-page";
import { DarkTrendCheckoutPage } from "./dark-trend/cart-checkout/dark-trend-checkout-page";
import { DarkTrendOrderSuccessPage } from "./dark-trend/cart-checkout/dark-trend-order-success-page";
import { DarkTrendCollectionPage } from "./dark-trend/collections/dark-trend-collection-page";
import { DarkTrendCollectionsPage } from "./dark-trend/collections/dark-trend-collections-page";
import { DarkTrendContactPage } from "./dark-trend/contact/dark-trend-contact-page";
import { DarkTrendGenericPage } from "./dark-trend/dark-trend-generic-page";
import { DarkTrendLayout } from "./dark-trend/layout/dark-trend-layout";
import { DarkTrendProductPage } from "./dark-trend/products/dark-trend-product-page";
import { DarkTrendShopPage } from "./dark-trend/shop/dark-trend-shop-page";
import { DarkTrendTestimonialsPage } from "./dark-trend/testimonials/dark-trend-testimonials-page";
// ---------------------------------------------------------------------------
// Default (required fallback — must implement every slot)
// ---------------------------------------------------------------------------
import { DefaultAboutPage } from "./default/about/default-about-page";
import { DefaultAccountSecurityPage } from "./default/account/default-account-security-page";
import { DefaultAccountSettingsPage } from "./default/account/default-account-settings-page";
import { DefaultAddressBookFallback } from "./default/account/default-address-book-fallback";
import { DefaultOrderDetailPage } from "./default/account/default-order-detail-page";
import { DefaultOrdersPage } from "./default/account/default-orders-page";
import { DefaultPreferencesFallback } from "./default/account/default-preferences-fallback";
import { DefaultBlogPage } from "./default/blog/default-blog-page";
import { DefaultBlogPostPage } from "./default/blog/default-blog-post-page";
import { DefaultCartPage } from "./default/cart-checkout/default-cart-page";
import { DefaultCheckoutPage } from "./default/cart-checkout/default-checkout-page";
import { DefaultCheckoutUnavailable } from "./default/cart-checkout/default-checkout-unavailable";
import { DefaultOrderSuccessPage } from "./default/cart-checkout/default-order-success-page";
import { DefaultCollectionPage } from "./default/collections/default-collection-page";
import { DefaultCollectionsPage } from "./default/collections/default-collections-page";
import { DefaultContactPage } from "./default/contact/default-contact-page";
import { DefaultGenericPage } from "./default/default-generic-page";
import { DefaultEventsPage } from "./default/events/default-events-page";
import { DefaultFaqPage } from "./default/faq/default-faq-page";
import { DefaultLayout } from "./default/layout/default-layout";
import { DefaultProductPage } from "./default/products/default-product-page";
import { DefaultServicesIndexPage } from "./default/services/default-services-index-page";
import { DefaultProductsPage } from "./default/shop/default-shop-page";
import { DefaultTestimonialsPage } from "./default/testimonials/default-testimonials-page";
import { DefaultVideosPage } from "./default/videos/default-videos-page";
// ---------------------------------------------------------------------------
// Elegant
// ---------------------------------------------------------------------------
import { ElegantAboutPage } from "./elegant/about/elegant-about-page";
import { ElegantAccountSecurityPage } from "./elegant/account/elegant-account-security-page";
import { ElegantAccountSettingsPage } from "./elegant/account/elegant-account-settings-page";
import { ElegantAddressBookPage } from "./elegant/account/elegant-address-book-page";
import { ElegantOrderDetailPage } from "./elegant/account/elegant-order-detail-page";
import { ElegantOrdersPage } from "./elegant/account/elegant-orders-page";
import { ElegantPreferencesPage } from "./elegant/account/elegant-preferences-page";
import { ElegantBlogPage } from "./elegant/blog/elegant-blog-page";
import { ElegantBlogPostPage } from "./elegant/blog/elegant-blog-post-page";
import { ElegantCartPage } from "./elegant/cart-checkout/elegant-cart-page";
import { ElegantCheckoutPage } from "./elegant/cart-checkout/elegant-checkout-page";
import { ElegantOrderSuccessPage } from "./elegant/cart-checkout/elegant-order-success-page";
import { ElegantCollectionPage } from "./elegant/collections/elegant-collection-page";
import { ElegantCollectionsPage } from "./elegant/collections/elegant-collections-page";
import { ElegantContactPage } from "./elegant/contact/elegant-contact-page";
import { ElegantGenericPage } from "./elegant/elegant-generic-page";
import { ElegantLayout } from "./elegant/layout/elegant-layout";
import { ElegantProductPage } from "./elegant/products/elegant-product-page";
import { ElegantShopPage } from "./elegant/shop/elegant-shop-page";
import { ElegantTestimonialsPage } from "./elegant/testimonials/elegant-testimonials-page";
// ---------------------------------------------------------------------------
// Happy Bamboo
// ---------------------------------------------------------------------------
import { HappyBambooAboutPage } from "./happy-bamboo/about/happy-bamboo-about-page";
import { HappyBambooAccountSecurityPage } from "./happy-bamboo/account/happy-bamboo-account-security-page";
import { HappyBambooAccountSettingsPage } from "./happy-bamboo/account/happy-bamboo-account-settings-page";
import { HappyBambooAddressBookPage } from "./happy-bamboo/account/happy-bamboo-address-book-page";
import { HappyBambooOrderDetailPage } from "./happy-bamboo/account/happy-bamboo-order-detail-page";
import { HappyBambooOrdersPage } from "./happy-bamboo/account/happy-bamboo-orders-page";
import { HappyBambooPreferencesPage } from "./happy-bamboo/account/happy-bamboo-preferences-page";
import { HappyBambooBlogPage } from "./happy-bamboo/blog/happy-bamboo-blog-page";
import { HappyBambooBlogPostPage } from "./happy-bamboo/blog/happy-bamboo-blog-post-page";
import { HappyBambooCartPage } from "./happy-bamboo/cart-checkout/happy-bamboo-cart-page";
import { HappyBambooCheckoutPage } from "./happy-bamboo/cart-checkout/happy-bamboo-checkout-page";
import { HappyBambooOrderSuccessPage } from "./happy-bamboo/cart-checkout/happy-bamboo-order-success-page";
import { HappyBambooCollectionPage } from "./happy-bamboo/collections/happy-bamboo-collection-page";
import { HappyBambooCollectionsPage } from "./happy-bamboo/collections/happy-bamboo-collections-page";
import { HappyBambooContactPage } from "./happy-bamboo/contact/happy-bamboo-contact-page";
import { HappyBambooGenericPage } from "./happy-bamboo/happy-bamboo-generic-page";
import { HappyBambooLayout } from "./happy-bamboo/layout/happy-bamboo-layout";
import { HappyBambooProductPage } from "./happy-bamboo/products/happy-bamboo-product-page";
import { HappyBambooShopPage } from "./happy-bamboo/shop/happy-bamboo-shop-page";
import { HappyBambooTestimonialsPage } from "./happy-bamboo/testimonials/happy-bamboo-testimonials-page";
// ---------------------------------------------------------------------------
// Modern
// ---------------------------------------------------------------------------
import { ModernAboutPage } from "./modern/about/modern-about-page";
import { ModernAccountSecurityPage } from "./modern/account/modern-account-security-page";
import { ModernAccountSettingsPage } from "./modern/account/modern-account-settings-page";
import { ModernAddressBookPage } from "./modern/account/modern-address-book-page";
import { ModernOrderDetailPage } from "./modern/account/modern-order-detail-page";
import { ModernOrdersPage } from "./modern/account/modern-orders-page";
import { ModernPreferencesPage } from "./modern/account/modern-preferences-page";
import { ModernBlogPage } from "./modern/blog/modern-blog-page";
import { ModernBlogPostPage } from "./modern/blog/modern-blog-post-page";
import ModernCartPage from "./modern/cart-checkout/modern-cart-page";
import { ModernCheckoutPage } from "./modern/cart-checkout/modern-checkout-page";
import { ModernOrderSuccessPage } from "./modern/cart-checkout/modern-order-success-page";
import { ModernCollectionPage } from "./modern/collections/modern-collection-page";
import { ModernCollectionsPage } from "./modern/collections/modern-collections-page";
import { ModernContactPage } from "./modern/contact/modern-contact-page";
import { ModernLayout } from "./modern/layout/modern-layout";
import { ModernGenericPage } from "./modern/modern-generic-page";
import { ModernProductPage } from "./modern/products/modern-product-page";
import { ModernProductsPage } from "./modern/shop/modern-products-page";
import { ModernTestimonialsPage } from "./modern/testimonials/modern-testimonials-page";
// ---------------------------------------------------------------------------
// Noise
// ---------------------------------------------------------------------------
import { NoiseAboutPage } from "./noise/about/noise-about-page";
import { NoiseAccountSecurityPage } from "./noise/account/noise-account-security-page";
import { NoiseAccountSettingsPage } from "./noise/account/noise-account-settings-page";
import { NoiseAddressBookPage } from "./noise/account/noise-address-book-page";
import { NoiseOrderDetailPage } from "./noise/account/noise-order-detail-page";
import { NoiseOrdersPage } from "./noise/account/noise-orders-page";
import { NoisePreferencesPage } from "./noise/account/noise-preferences-page";
import { NoiseBlogPage } from "./noise/blog/noise-blog-page";
import { NoiseBlogPostPage } from "./noise/blog/noise-blog-post-page";
import { NoiseCartPage } from "./noise/cart-checkout/noise-cart-page";
import { NoiseCheckoutPage } from "./noise/cart-checkout/noise-checkout-page";
import { NoiseOrderSuccessPage } from "./noise/cart-checkout/noise-order-success-page";
import { NoiseCollectionPage } from "./noise/collections/noise-collection-page";
import { NoiseCollectionsPage } from "./noise/collections/noise-collections-page";
import { NoiseContactPage } from "./noise/contact/noise-contact-page";
import { NoiseLayout } from "./noise/layout/noise-layout";
import { NoiseGenericPage } from "./noise/noise-generic-page";
import { NoiseProductPage } from "./noise/products/noise-product-page";
import { NoiseShopPage } from "./noise/shop/noise-shop-page";
import { NoiseTestimonialsPage } from "./noise/testimonials/noise-testimonials-page";
import { PinkAboutPage } from "./pink/about/pink-about-page";
import { PinkAccountSecurityPage } from "./pink/account/pink-account-security-page";
import { PinkAccountSettingsPage } from "./pink/account/pink-account-settings-page";
import { PinkAddressBookPage } from "./pink/account/pink-address-book-page";
import { PinkOrderDetailPage } from "./pink/account/pink-order-detail-page";
import { PinkOrdersPage } from "./pink/account/pink-orders-page";
import { PinkPreferencesPage } from "./pink/account/pink-preferences-page";
import { PinkBlogPage } from "./pink/blog/pink-blog-page";
import { PinkBlogPostPage } from "./pink/blog/pink-blog-post-page";
import { PinkCartPage } from "./pink/cart-checkout/pink-cart-page";
import { PinkCheckoutPage } from "./pink/cart-checkout/pink-checkout-page";
import { PinkCheckoutUnavailable } from "./pink/cart-checkout/pink-checkout-unavailable";
import { PinkOrderSuccessPage } from "./pink/cart-checkout/pink-order-success-page";
import { PinkCollectionPage } from "./pink/collections/pink-collection-page";
import { PinkCollectionsPage } from "./pink/collections/pink-collections-page";
import { PinkContactPage } from "./pink/contact/pink-contact-page";
import { PinkEventsIndexPage } from "./pink/events/pink-events-index-page";
import { PinkGenericPage } from "./pink/generic/pink-generic-page";
import { PinkLayout } from "./pink/layout/pink-layout";
import { PinkProductPage } from "./pink/products/pink-product-page";
import { PinkServicesIndexPage } from "./pink/services/pink-services-index-page";
import { PinkShopPage } from "./pink/shop/pink-shop-page";
import { PinkTestimonialsPage } from "./pink/testimonials/pink-testimonials-page";
// Wired ahead of the file landing — another agent is creating this path in
// parallel (see registry.ts comment at the pink TEMPLATES entry).
import { PinkVideosPage } from "./pink/videos/pink-videos-page";
// ---------------------------------------------------------------------------
// Pollen
// ---------------------------------------------------------------------------
import { PollenAboutPage } from "./pollen/about/pollen-about-page";
import { PollenAccountSecurityPage } from "./pollen/account/pollen-account-security-page";
import { PollenAccountSettingsPage } from "./pollen/account/pollen-account-settings-page";
import { PollenAddressBookPage } from "./pollen/account/pollen-address-book-page";
import { PollenOrderDetailPage } from "./pollen/account/pollen-order-detail-page";
import { PollenOrdersPage } from "./pollen/account/pollen-orders-page";
import { PollenPreferencesPage } from "./pollen/account/pollen-preferences-page";
import { PollenBlogPage } from "./pollen/blog/pollen-blog-page";
import { PollenBlogPostPage } from "./pollen/blog/pollen-blog-post-page";
import { PollenCartPage } from "./pollen/cart-checkout/pollen-cart-page";
import { PollenCheckoutPage } from "./pollen/cart-checkout/pollen-checkout-page";
import { PollenOrderSuccessPage } from "./pollen/cart-checkout/pollen-order-success-page";
import { PollenCollectionPage } from "./pollen/collections/pollen-collection-page";
import { PollenCollectionsPage } from "./pollen/collections/pollen-collections-page";
import { PollenContactPage } from "./pollen/contact/pollen-contact-page";
import { PollenLayout } from "./pollen/layout/pollen-layout";
import { PollenGenericPage } from "./pollen/pollen-generic-page";
import { PollenProductPage } from "./pollen/products/pollen-product-page";
import { PollenServicesPage } from "./pollen/services/pollen-services-page";
import { PollenShopPage } from "./pollen/shop/pollen-shop-page";
import { PollenTestimonialsPage } from "./pollen/testimonials/pollen-testimonials-page";
// ---------------------------------------------------------------------------
// PinkArt
// ---------------------------------------------------------------------------
import { RelocationAboutPage } from "./relocation/about/relocation-about-page";
import { RelocationContactPage } from "./relocation/contact/relocation-contact-page";
import { RelocationFaqPage } from "./relocation/faq/relocation-faq-page";
import { RelocationGenericPage } from "./relocation/generic/relocation-generic-page";
import { RelocationLayout } from "./relocation/layout/relocation-layout";
import { RelocationServicesPage } from "./relocation/services/relocation-services-page";
import { RelocationTestimonialsPage } from "./relocation/testimonials/relocation-testimonials-page";
// ---------------------------------------------------------------------------
// Sledge
// ---------------------------------------------------------------------------
import { SledgeAboutPage } from "./sledge/about/sledge-about-page";
import { SledgeAccountSecurityPage } from "./sledge/account/sledge-account-security-page";
import { SledgeAccountSettingsPage } from "./sledge/account/sledge-account-settings-page";
import { SledgeAddressBookPage } from "./sledge/account/sledge-address-book-page";
import { SledgeOrderDetailPage } from "./sledge/account/sledge-order-detail-page";
import { SledgeOrdersPage } from "./sledge/account/sledge-orders-page";
import { SledgePreferencesPage } from "./sledge/account/sledge-preferences-page";
import { SledgeBlogPage } from "./sledge/blog/sledge-blog-page";
import { SledgeBlogPostPage } from "./sledge/blog/sledge-blog-post-page";
import { SledgeCartPage } from "./sledge/cart-checkout/sledge-cart-page";
import { SledgeCheckoutPage } from "./sledge/cart-checkout/sledge-checkout-page";
import { SledgeOrderSuccessPage } from "./sledge/cart-checkout/sledge-order-success-page";
import { SledgeCollectionPage } from "./sledge/collections/sledge-collection-page";
import { SledgeCollectionsPage } from "./sledge/collections/sledge-collections-page";
import { SledgeContactPage } from "./sledge/contact/sledge-contact-page";
import { SledgeLayout } from "./sledge/layout/sledge-layout";
import { SledgeProductPage } from "./sledge/products/sledge-product-page";
import { SledgeShopPage } from "./sledge/shop/sledge-shop-page";
import { SledgeGenericPage } from "./sledge/sledge-generic-page";
import { SledgeTestimonialsPage } from "./sledge/testimonials/sledge-testimonials-page";
// ---------------------------------------------------------------------------
// Vii (Skinbar VII)
// ---------------------------------------------------------------------------
import { ViiAboutPage } from "./vii/about/vii-about-page";
import { ViiAccountSecurityPage } from "./vii/account/vii-account-security-page";
import { ViiAccountSettingsPage } from "./vii/account/vii-account-settings-page";
import { ViiAddressBookPage } from "./vii/account/vii-address-book-page";
import { ViiOrderDetailPage } from "./vii/account/vii-order-detail-page";
import { ViiOrdersPage } from "./vii/account/vii-orders-page";
import { ViiPreferencesPage } from "./vii/account/vii-preferences-page";
import { ViiBlogPage } from "./vii/blog/vii-blog-page";
import { ViiBlogPostPage } from "./vii/blog/vii-blog-post-page";
import { ViiCartPage } from "./vii/cart-checkout/vii-cart-page";
import { ViiCheckoutPage } from "./vii/cart-checkout/vii-checkout-page";
import { ViiCheckoutUnavailable } from "./vii/cart-checkout/vii-checkout-unavailable";
import { ViiOrderSuccessPage } from "./vii/cart-checkout/vii-order-success-page";
import { ViiCollectionPage } from "./vii/collections/vii-collection-page";
import { ViiCollectionsPage } from "./vii/collections/vii-collections-page";
import { ViiContactPage } from "./vii/contact/vii-contact-page";
import { ViiGenericPage } from "./vii/generic/vii-generic-page";
import { ViiLayout } from "./vii/layout/vii-layout";
import { ViiProductPage } from "./vii/products/vii-product-page";
import { ViiServicesIndexPage } from "./vii/services/vii-services-index-page";
import { ViiShopPage } from "./vii/shop/vii-shop-page";
import { ViiTestimonialsPage } from "./vii/testimonials/vii-testimonials-page";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyComponent = ComponentType<any>;

/**
 * Every page slot available in the storefront. The `default` template entry
 * must satisfy all required slots; non-default templates provide a partial
 * override via `Partial<TemplateComponentSet>`.
 *
 * `ServicesPage` is optional — only pollen implements it. Routes check for its
 * presence and call `notFound()` when it is absent.
 *
 * `EventsPage`, `VideosPage` and `FaqPage` are optional in the type but always
 * present on `defaultEntry`, so their routes' presence checks only satisfy
 * TypeScript's optional-slot typing.
 *
 * `CheckoutUnavailable` is the component rendered when Stripe is not connected.
 * All templates fall back to `DefaultCheckoutUnavailable`.
 */
export type TemplateComponentSet = {
  // Layout wrapper
  Layout: AnyComponent;
  // Standalone pages
  AboutPage: AnyComponent;
  BlogPage: AnyComponent;
  BlogPostPage: AnyComponent;
  CartPage: AnyComponent;
  CheckoutPage: AnyComponent;
  CheckoutUnavailable: AnyComponent;
  OrderSuccessPage: AnyComponent;
  CollectionPage: AnyComponent;
  CollectionsPage: AnyComponent;
  ContactPage: AnyComponent;
  GenericPage: AnyComponent;
  ProductPage: AnyComponent;
  ShopPage: AnyComponent;
  TestimonialsPage: AnyComponent;
  // Account pages
  AccountSettingsPage: AnyComponent;
  AccountSecurityPage: AnyComponent;
  AddressBookPage: AnyComponent;
  OrderDetailPage: AnyComponent;
  OrdersPage: AnyComponent;
  PreferencesPage: AnyComponent;
  // Optional — only some templates implement this
  ServicesPage?: AnyComponent;
  ServicesIndexPage?: AnyComponent;
  EventsPage?: AnyComponent;
  VideosPage?: AnyComponent;
  // Optional per-template override of /faq; defaultEntry always supplies one.
  FaqPage?: AnyComponent;
};

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

const defaultEntry: TemplateComponentSet = {
  Layout: DefaultLayout,
  AboutPage: DefaultAboutPage,
  BlogPage: DefaultBlogPage,
  BlogPostPage: DefaultBlogPostPage,
  CartPage: DefaultCartPage,
  CheckoutPage: DefaultCheckoutPage,
  CheckoutUnavailable: DefaultCheckoutUnavailable,
  OrderSuccessPage: DefaultOrderSuccessPage,
  CollectionPage: DefaultCollectionPage,
  CollectionsPage: DefaultCollectionsPage,
  ContactPage: DefaultContactPage,
  GenericPage: DefaultGenericPage,
  ProductPage: DefaultProductPage,
  ShopPage: DefaultProductsPage,
  TestimonialsPage: DefaultTestimonialsPage,
  AccountSettingsPage: DefaultAccountSettingsPage,
  AccountSecurityPage: DefaultAccountSecurityPage,
  AddressBookPage: DefaultAddressBookFallback,
  OrderDetailPage: DefaultOrderDetailPage,
  OrdersPage: DefaultOrdersPage,
  PreferencesPage: DefaultPreferencesFallback,
  ServicesIndexPage: DefaultServicesIndexPage,
  EventsPage: DefaultEventsPage,
  VideosPage: DefaultVideosPage,
  FaqPage: DefaultFaqPage,
};

const TEMPLATES: Record<string, Partial<TemplateComponentSet>> = {
  default: defaultEntry,

  bamboo: {
    Layout: BambooLayout,
    AboutPage: BambooAboutPage,
    BlogPage: BambooBlogPage,
    BlogPostPage: BambooBlogPostPage,
    CartPage: BambooCartPage,
    CheckoutPage: BambooCheckoutPage,
    OrderSuccessPage: BambooOrderSuccessPage,
    CollectionPage: BambooCollectionPage,
    CollectionsPage: BambooCollectionsPage,
    ContactPage: BambooContactPage,
    GenericPage: BambooGenericPage,
    ProductPage: BambooProductPage,
    ShopPage: BambooShopPage,
    TestimonialsPage: BambooTestimonialsPage,
    AccountSettingsPage: BambooAccountSettingsPage,
    AccountSecurityPage: BambooAccountSecurityPage,
    AddressBookPage: BambooAddressBookPage,
    OrderDetailPage: BambooOrderDetailPage,
    OrdersPage: BambooOrdersPage,
    PreferencesPage: BambooPreferencesPage,
  },

  "dark-trend": {
    Layout: DarkTrendLayout,
    AboutPage: DarkTrendAboutPage,
    BlogPage: DarkTrendBlogPage,
    BlogPostPage: DarkTrendBlogPostPage,
    CartPage: DarkTrendCartPage,
    CheckoutPage: DarkTrendCheckoutPage,
    OrderSuccessPage: DarkTrendOrderSuccessPage,
    CollectionPage: DarkTrendCollectionPage,
    CollectionsPage: DarkTrendCollectionsPage,
    ContactPage: DarkTrendContactPage,
    GenericPage: DarkTrendGenericPage,
    ProductPage: DarkTrendProductPage,
    ShopPage: DarkTrendShopPage,
    TestimonialsPage: DarkTrendTestimonialsPage,
    AccountSettingsPage: DarkTrendAccountSettingsPage,
    AccountSecurityPage: DarkTrendAccountSecurityPage,
    AddressBookPage: DarkTrendAddressBookPage,
    OrderDetailPage: DarkTrendOrderDetailPage,
    OrdersPage: DarkTrendOrdersPage,
    PreferencesPage: DarkTrendPreferencesPage,
  },

  elegant: {
    Layout: ElegantLayout,
    AboutPage: ElegantAboutPage,
    BlogPage: ElegantBlogPage,
    BlogPostPage: ElegantBlogPostPage,
    CartPage: ElegantCartPage,
    CheckoutPage: ElegantCheckoutPage,
    OrderSuccessPage: ElegantOrderSuccessPage,
    CollectionPage: ElegantCollectionPage,
    CollectionsPage: ElegantCollectionsPage,
    ContactPage: ElegantContactPage,
    GenericPage: ElegantGenericPage,
    ProductPage: ElegantProductPage,
    ShopPage: ElegantShopPage,
    TestimonialsPage: ElegantTestimonialsPage,
    AccountSettingsPage: ElegantAccountSettingsPage,
    AccountSecurityPage: ElegantAccountSecurityPage,
    AddressBookPage: ElegantAddressBookPage,
    OrderDetailPage: ElegantOrderDetailPage,
    OrdersPage: ElegantOrdersPage,
    PreferencesPage: ElegantPreferencesPage,
  },

  "happy-bamboo": {
    Layout: HappyBambooLayout,
    AboutPage: HappyBambooAboutPage,
    BlogPage: HappyBambooBlogPage,
    BlogPostPage: HappyBambooBlogPostPage,
    CartPage: HappyBambooCartPage,
    CheckoutPage: HappyBambooCheckoutPage,
    OrderSuccessPage: HappyBambooOrderSuccessPage,
    CollectionPage: HappyBambooCollectionPage,
    CollectionsPage: HappyBambooCollectionsPage,
    ContactPage: HappyBambooContactPage,
    GenericPage: HappyBambooGenericPage,
    ProductPage: HappyBambooProductPage,
    ShopPage: HappyBambooShopPage,
    TestimonialsPage: HappyBambooTestimonialsPage,
    AccountSettingsPage: HappyBambooAccountSettingsPage,
    AccountSecurityPage: HappyBambooAccountSecurityPage,
    AddressBookPage: HappyBambooAddressBookPage,
    OrderDetailPage: HappyBambooOrderDetailPage,
    OrdersPage: HappyBambooOrdersPage,
    PreferencesPage: HappyBambooPreferencesPage,
  },

  modern: {
    Layout: ModernLayout,
    AboutPage: ModernAboutPage,
    BlogPage: ModernBlogPage,
    BlogPostPage: ModernBlogPostPage,
    CartPage: ModernCartPage,
    CheckoutPage: ModernCheckoutPage,
    OrderSuccessPage: ModernOrderSuccessPage,
    CollectionPage: ModernCollectionPage,
    CollectionsPage: ModernCollectionsPage,
    ContactPage: ModernContactPage,
    GenericPage: ModernGenericPage,
    ProductPage: ModernProductPage,
    ShopPage: ModernProductsPage,
    TestimonialsPage: ModernTestimonialsPage,
    AccountSettingsPage: ModernAccountSettingsPage,
    AccountSecurityPage: ModernAccountSecurityPage,
    AddressBookPage: ModernAddressBookPage,
    OrderDetailPage: ModernOrderDetailPage,
    OrdersPage: ModernOrdersPage,
    PreferencesPage: ModernPreferencesPage,
  },

  builders: {
    Layout: BuildersLayout,
    AboutPage: BuildersAboutPage,
    ContactPage: BuildersContactPage,
    GenericPage: BuildersGenericPage,
    ServicesIndexPage: BuildersServicesIndexPage,
    TestimonialsPage: BuildersTestimonialsPage,
  },

  // Pixel-exact replica of buildingcooperatively.com — service archetype,
  // no commerce/services slots. Everything unlisted falls back to Default.
  coop: {
    Layout: CoopLayout,
    AboutPage: CoopAboutPage,
    ContactPage: CoopContactPage,
    GenericPage: CoopGenericPage,
  },

  // PinkArt LLC — hybrid archetype: full commerce + services + content, plus a
  // custom account set. `ServicesPage` is deliberately omitted (that slot is the
  // legacy flag-off path, used only by pollen); `ServicesIndexPage` is the
  // flag-on one. Service DETAIL pages dispatch separately through
  // `_service-pages/registry.ts` via the `pink-table` def.
  pink: {
    Layout: PinkLayout,
    AboutPage: PinkAboutPage,
    BlogPage: PinkBlogPage,
    BlogPostPage: PinkBlogPostPage,
    CartPage: PinkCartPage,
    CheckoutPage: PinkCheckoutPage,
    CheckoutUnavailable: PinkCheckoutUnavailable,
    OrderSuccessPage: PinkOrderSuccessPage,
    CollectionPage: PinkCollectionPage,
    CollectionsPage: PinkCollectionsPage,
    ContactPage: PinkContactPage,
    EventsPage: PinkEventsIndexPage,
    VideosPage: PinkVideosPage,
    GenericPage: PinkGenericPage,
    ProductPage: PinkProductPage,
    ShopPage: PinkShopPage,
    TestimonialsPage: PinkTestimonialsPage,
    ServicesIndexPage: PinkServicesIndexPage,
    AccountSettingsPage: PinkAccountSettingsPage,
    AccountSecurityPage: PinkAccountSecurityPage,
    AddressBookPage: PinkAddressBookPage,
    OrderDetailPage: PinkOrderDetailPage,
    OrdersPage: PinkOrdersPage,
    PreferencesPage: PinkPreferencesPage,
  },

  // Handy Relocations — service archetype (1:1 recreation of
  // handyrelocations.com): no commerce/blog slots, all of those fall back to
  // Default. Uses the legacy `ServicesPage` slot (the `services` feature flag
  // stays OFF for this template, like pollen) and the optional `FaqPage` slot.
  relocation: {
    Layout: RelocationLayout,
    AboutPage: RelocationAboutPage,
    ContactPage: RelocationContactPage,
    FaqPage: RelocationFaqPage,
    GenericPage: RelocationGenericPage,
    ServicesPage: RelocationServicesPage,
    TestimonialsPage: RelocationTestimonialsPage,
  },

  noise: {
    Layout: NoiseLayout,
    AboutPage: NoiseAboutPage,
    BlogPage: NoiseBlogPage,
    BlogPostPage: NoiseBlogPostPage,
    CartPage: NoiseCartPage,
    CheckoutPage: NoiseCheckoutPage,
    OrderSuccessPage: NoiseOrderSuccessPage,
    CollectionPage: NoiseCollectionPage,
    CollectionsPage: NoiseCollectionsPage,
    ContactPage: NoiseContactPage,
    GenericPage: NoiseGenericPage,
    ProductPage: NoiseProductPage,
    ShopPage: NoiseShopPage,
    TestimonialsPage: NoiseTestimonialsPage,
    AccountSettingsPage: NoiseAccountSettingsPage,
    AccountSecurityPage: NoiseAccountSecurityPage,
    AddressBookPage: NoiseAddressBookPage,
    OrderDetailPage: NoiseOrderDetailPage,
    OrdersPage: NoiseOrdersPage,
    PreferencesPage: NoisePreferencesPage,
  },

  pollen: {
    Layout: PollenLayout,
    AboutPage: PollenAboutPage,
    BlogPage: PollenBlogPage,
    BlogPostPage: PollenBlogPostPage,
    CartPage: PollenCartPage,
    CheckoutPage: PollenCheckoutPage,
    OrderSuccessPage: PollenOrderSuccessPage,
    CollectionPage: PollenCollectionPage,
    CollectionsPage: PollenCollectionsPage,
    ContactPage: PollenContactPage,
    GenericPage: PollenGenericPage,
    ProductPage: PollenProductPage,
    ShopPage: PollenShopPage,
    TestimonialsPage: PollenTestimonialsPage,
    AccountSettingsPage: PollenAccountSettingsPage,
    AccountSecurityPage: PollenAccountSecurityPage,
    AddressBookPage: PollenAddressBookPage,
    OrderDetailPage: PollenOrderDetailPage,
    OrdersPage: PollenOrdersPage,
    PreferencesPage: PollenPreferencesPage,
    ServicesPage: PollenServicesPage,
  },

  sledge: {
    Layout: SledgeLayout,
    AboutPage: SledgeAboutPage,
    BlogPage: SledgeBlogPage,
    BlogPostPage: SledgeBlogPostPage,
    CartPage: SledgeCartPage,
    CheckoutPage: SledgeCheckoutPage,
    OrderSuccessPage: SledgeOrderSuccessPage,
    CollectionPage: SledgeCollectionPage,
    CollectionsPage: SledgeCollectionsPage,
    ContactPage: SledgeContactPage,
    GenericPage: SledgeGenericPage,
    ProductPage: SledgeProductPage,
    ShopPage: SledgeShopPage,
    TestimonialsPage: SledgeTestimonialsPage,
    AccountSettingsPage: SledgeAccountSettingsPage,
    AccountSecurityPage: SledgeAccountSecurityPage,
    AddressBookPage: SledgeAddressBookPage,
    OrderDetailPage: SledgeOrderDetailPage,
    OrdersPage: SledgeOrdersPage,
    PreferencesPage: SledgePreferencesPage,
  },
  vii: {
    Layout: ViiLayout,
    AboutPage: ViiAboutPage,
    BlogPage: ViiBlogPage,
    BlogPostPage: ViiBlogPostPage,
    ContactPage: ViiContactPage,
    ShopPage: ViiShopPage,
    ProductPage: ViiProductPage,
    CollectionsPage: ViiCollectionsPage,
    CollectionPage: ViiCollectionPage,
    CartPage: ViiCartPage,
    GenericPage: ViiGenericPage,
    CheckoutPage: ViiCheckoutPage,
    CheckoutUnavailable: ViiCheckoutUnavailable,
    OrderSuccessPage: ViiOrderSuccessPage,
    AccountSettingsPage: ViiAccountSettingsPage,
    AccountSecurityPage: ViiAccountSecurityPage,
    AddressBookPage: ViiAddressBookPage,
    OrderDetailPage: ViiOrderDetailPage,
    OrdersPage: ViiOrdersPage,
    PreferencesPage: ViiPreferencesPage,
    TestimonialsPage: ViiTestimonialsPage,
    ServicesIndexPage: ViiServicesIndexPage,
  },
};

/**
 * Returns the full `TemplateComponentSet` for the given templateId.
 *
 * Unknown ids resolve to `default`. Partial template entries are merged over
 * the default entry so every slot is always populated.
 */
export function getTemplate(templateId: string): TemplateComponentSet {
  const override = TEMPLATES[templateId] ?? {};
  return { ...defaultEntry, ...override };
}
