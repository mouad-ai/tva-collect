# TVA Collect Domain and DNS Strategy

## Cheapest Clean Path

Buy a `.com` first, then buy `.ma` later after the product has paying Moroccan cabinets.

Recommended first choice:

```txt
tvacollect.com
```

If unavailable, check:

```txt
tvacollectapp.com
tva-collect.com
tvacollectpro.com
collecttva.com
```

Buy later:

```txt
tvacollect.ma
```

Use the `.ma` domain later for Moroccan branding or redirect it to the `.com`.

## Why `.com` First

```txt
cheaper
faster to buy
easy DNS
easy renewal
international
perfectly fine for SaaS pilots
```

## Registrar Recommendation

### 1. Cloudflare Registrar

Best default for `.com` if the name is available.

Why:

```txt
at-cost registration and renewal
free DNS
free SSL/CDN features
free WHOIS redaction
clean DNS management
```

Cloudflare says its Registrar uses at-cost registration and renewal, without hidden add-on fees or inflated renewal costs, and includes DNS/SSL/CDN/security features.

### 2. Namecheap

Use only if Cloudflare cannot register the exact domain you want.

Why:

```txt
easy checkout
simple beginner UI
wide TLD support
```

After purchase, point DNS to Cloudflare.

Watch renewal pricing before buying.

### 3. `.ma` Accredited Registrar

For `.ma`, use an official registrar from the ANRT / registre.ma list.

Compare:

```txt
Heberjahiz
Genious
Naja7Host
ADK Media
Cap Connect
```

Buy `.ma` only when the price is acceptable or when Morocco-local branding matters.

## Recommended DNS Setup

Use Cloudflare DNS.

Create these records:

```txt
A      app      VPS_IP
A      www      VPS_IP
A      @        VPS_IP
```

Recommended app structure:

```txt
app.tvacollect.com   TVA Collect SaaS app
www.tvacollect.com   public landing page
tvacollect.com       redirect to www or landing page
```

Production environment:

```env
APP_URL=https://app.tvacollect.com
NEXTAUTH_URL=https://app.tvacollect.com
```

If using `.ma` later:

```txt
app.tvacollect.ma redirects to app.tvacollect.com
www.tvacollect.ma redirects to www.tvacollect.com
```

## Do Not Buy

Avoid hosting/domain bundles just because they advertise a free domain.

TVA Collect deployment needs:

```txt
domain registrar
DNS
VPS
Docker
PostgreSQL
Nginx
object storage / backups
SMTP
```

It does not need shared hosting.

## Final Cheap Setup

```txt
Domain: Cloudflare Registrar .com
DNS: Cloudflare free DNS
SSL: Let's Encrypt on VPS
VPS: separate provider
Email: SMTP provider later
.ma: buy after first paying clients
```

Start with `.com`; it is enough for pilots.
