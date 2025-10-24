# LetsPrint - GST Invoice Manager

## Deployment Information

### Server Details
- **Server:** 72.60.99.154
- **Domain:** https://letsprint.indigenservices.com  
- **Port:** 3003 (internal)
- **SSL:** Configured with Let's Encrypt

### Application Stack
- **Framework:** Remix (Official Shopify Template)
- **Database:** SQLite with Prisma ORM
- **Process Manager:** PM2
- **Web Server:** Nginx (reverse proxy)
- **Node.js:** v20.19.5

### Environment Configuration

The following environment variables are configured in `.env`:

```env
SHOPIFY_API_KEY=your_shopify_api_key_here
SHOPIFY_API_SECRET=your_shopify_api_secret_here
SCOPES=read_customers,write_files,read_locations,read_orders,read_products,read_analytics,read_content,read_inventory,read_product_listings,read_reports,read_shipping,write_content
HOST=https://letsprint.indigenservices.com
```

### Deployment Instructions

1. **SSH into the server:**
   ```bash
   ssh root@72.60.99.154
   ```

2. **Navigate to the project:**
   ```bash
   cd /path/to/letsprint-remix-app
   ```

3. **Run deployment script:**
   ```bash
   ./deploy.sh
   ```

### Manual Deployment Steps

If you prefer manual deployment:

```bash
# Stop existing process
pm2 stop letsprint

# Install dependencies
npm ci --production

# Run migrations
npm run setup

# Build application
npm run build

# Start application
pm2 start ecosystem.config.cjs

# Save PM2 configuration
pm2 save
```

### Management Commands

```bash
# View logs
pm2 logs letsprint

# Check status
pm2 status

# Restart app
pm2 restart letsprint

# Stop app
pm2 stop letsprint

# Monitor
pm2 monit
```

### Nginx Configuration

The nginx configuration is already set up at `/etc/nginx/sites-available/letsprint`:

```nginx
server {
    listen 80;
    server_name letsprint.indigenservices.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name letsprint.indigenservices.com;

    ssl_certificate /etc/letsencrypt/live/letsprint.indigenservices.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/letsprint.indigenservices.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3003;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Features Implemented

#### Core Features ✅
- [x] Shopify OAuth Authentication
- [x] Orders listing with search and filtering
- [x] GST calculation (CGST/SGST/IGST)
- [x] HSN Code management for products
- [x] Business settings configuration
- [x] Dashboard with statistics

#### Services Migrated ✅
- [x] GST Service (CGST/SGST/IGST calculations)
- [x] PDF Service (Puppeteer-based)
- [x] Order Utils
- [x] CSV Export Service
- [x] Template Service
- [x] File Storage Service

#### Routes Created ✅
- `/app` - Main dashboard
- `/app/orders` - Orders management
- `/app/hsn-codes` - HSN code assignment
- `/app/settings` - Business configuration

#### Pending Features 🔄
- [ ] PDF invoice generation route
- [ ] Email automation with nodemailer
- [ ] Webhook handlers for order events
- [ ] Bulk invoice processing
- [ ] GST reports and GSTR-1 export
- [ ] WhatsApp integration

### Database Schema

The app uses Prisma with SQLite. Main tables:

- `Session` - Shopify session storage
- Additional tables can be added via migrations

### Troubleshooting

#### App not loading
```bash
pm2 logs letsprint --lines 100
```

#### Database issues
```bash
cd /var/www/letsprint
npm run setup
```

#### Rebuild app
```bash
cd /var/www/letsprint
npm run build
pm2 restart letsprint
```

#### SSL certificate renewal
```bash
certbot renew
systemctl reload nginx
```

### Support

For issues or questions:
- Check logs: `pm2 logs letsprint`
- Check PM2 status: `pm2 status`
- Check nginx logs: `tail -f /var/log/nginx/letsprint_error.log`

### Security Notes

- All credentials are stored in `.env` file (not in version control)
- SSL certificates are managed by Let's Encrypt
- Database is file-based SQLite (suitable for single-store usage)
- For multi-tenant, consider migrating to PostgreSQL

### Next Steps

1. Test OAuth flow by installing the app in Shopify admin
2. Configure business information in Settings
3. Assign HSN codes to products
4. Generate test invoices
5. Set up email configuration for automated sending
6. Configure webhooks for order events

### Shopify Partner Configuration

The app is configured with:
- **App URL:** https://letsprint.indigenservices.com
- **Redirect URLs:**
  - https://letsprint.indigenservices.com/api/auth-callback
  - https://letsprint.indigenservices.com/api/auth/callback
  - https://letsprint.indigenservices.com/auth/callback
  - https://letsprint.indigenservices.com/api/auth
  - https://letsprint.indigenservices.com/dashboard
- **Scopes:** read_customers, write_files, read_locations, read_orders, read_products, read_analytics, read_content, read_inventory, read_product_listings, read_reports, read_shipping, write_content
- **Webhooks:** Configured for GDPR compliance

## Development

### Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start
```

### Adding New Features

1. Create routes in `app/routes/`
2. Add services in `app/services/`
3. Update types in `app/types/`
4. Test locally
5. Deploy to production

### Code Structure

```
app/
├── routes/           # Remix routes
│   ├── app._index.tsx    # Dashboard
│   ├── app.orders.tsx    # Orders page
│   ├── app.hsn-codes.tsx # HSN management
│   └── app.settings.tsx  # Settings
├── services/         # Business logic
│   ├── gstService.ts     # GST calculations
│   ├── pdfService.ts     # PDF generation
│   └── ...
├── types/            # TypeScript types
├── utils/            # Utility functions
└── shopify.server.ts # Shopify configuration
```

## License

Proprietary - All rights reserved
