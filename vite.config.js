import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Custom Vite middleware to serve native API endpoints directly on port 5173
function localApiPlugin() {
  return {
    name: 'glow-native-api',
    configureServer(server) {
      server.middlewares.use('/api/bookings', (req, res, next) => {
        if (req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', () => {
            try {
              const data = JSON.parse(body || '{}');
              console.log('\n=============================================');
              console.log('>>> [NATIVE API HIT] Incoming Booking Request:');
              console.log('Patient:', data.patient_name);
              console.log('Phone:', data.patient_phone);
              console.log('Service:', data.service_name);
              console.log('Time:', data.start_time);
              console.log('=============================================\n');

              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 200;
              res.end(JSON.stringify({
                success: true,
                message: "Native appointment booked directly!",
                eventId: "native_gcal_" + Date.now(),
                data: data
              }));
            } catch (err) {
              res.statusCode = 400;
              res.end(JSON.stringify({ success: false, error: "Invalid JSON" }));
            }
          });
        } else {
          next();
        }
      });
    }
  };
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    localApiPlugin(),
  ],
})
