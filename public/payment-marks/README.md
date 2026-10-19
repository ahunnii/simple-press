# Payment marks

Logos for the storefront "we accept" row. File names are our `PaymentMarkId`
values (see `src/lib/stripe/accepted-payment-marks.ts`); labels live in
`src/app/(storefront)/_components/payment-marks.tsx`. All are 38 by 24
card-style pills.

## Source

Shopify's `activemerchant/payment_icons`, MIT licensed:
https://github.com/activemerchant/payment_icons

- Commit `fc8c830a5ca576553df88bf364fd449ea7b4f069` (2026-09-30), downloaded 2026-10-19.
- Path in the repo: `app/assets/images/payment_icons/<name>.svg`.

| Our file | Repo file |
| --- | --- |
| visa.svg | visa.svg |
| mastercard.svg | master.svg |
| amex.svg | american_express.svg |
| discover.svg | discover.svg |
| apple_pay.svg | apple_pay.svg |
| google_pay.svg | google_pay.svg |
| paypal.svg | paypal.svg |
| klarna.svg | klarna.svg |
| affirm.svg | affirm.svg |
| afterpay_clearpay.svg | afterpay.svg |
| cashapp.svg | cashapppay.svg |
| amazon_pay.svg | amazon.svg |
| us_bank_account.svg | genericbank.svg (one fix: its clip-path pointed at an id that did not exist; renamed to match the clipPath id) |

All repo files were checked before copying: no scripts, event attributes,
foreignObject, external links or style imports; only internal `url(#id)`
references.

## Hand-authored

- `link.svg` (Stripe Link). The source repo has no Link icon, so this is a
  simple green pill with the word "link" in plain text, not Stripe's official
  artwork. Swap in Stripe's official Link mark if we get one.

## License (MIT, from the source repo)

Copyright 2015 Shopify Inc

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
