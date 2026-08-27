require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const http = require('http');
const { Server } = require('socket.io');
const escpos = require('escpos');
// Install escpos-usb and escpos-network adapters
escpos.USB = require('escpos-usb');
escpos.Network = require('escpos-network');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// --- AI Routes ---
const aiRoutes = require('./routes/aiRoutes');
app.use('/api/ai', aiRoutes);

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // allow frontend access
    methods: ["GET", "POST"]
  }
});

// --- OFFLINE SYNC (SOCKET.IO) ---
// Store orders in memory during offline mode
const offlineOrders = new Map();

io.on('connection', (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);

  // Send current offline state to new client
  socket.emit('sync_initial', Array.from(offlineOrders.values()));

  socket.on('new_order', (orderData) => {
    console.log(`[Socket] New order received: ${orderData.id}`);
    offlineOrders.set(orderData.id, orderData);
    // Broadcast to all other clients (e.g. KDS)
    socket.broadcast.emit('order_added', orderData);
  });

  socket.on('update_order_status', (data) => {
    const { orderId, status } = data;
    console.log(`[Socket] Order ${orderId} updated to ${status}`);
    if (offlineOrders.has(orderId)) {
      const order = offlineOrders.get(orderId);
      order.status = status;
      offlineOrders.set(orderId, order);
    }
    // Broadcast update
    socket.broadcast.emit('order_updated', data);
  });

  socket.on('disconnect', () => {
    console.log(`[Socket] Client disconnected: ${socket.id}`);
  });
});


// --- LOCAL PRINT AGENT ---

const printReceipt = (order, printerDevice) => {
  return new Promise((resolve, reject) => {
    try {
      const printer = new escpos.Printer(printerDevice);
      
      printerDevice.open(function(err) {
        if (err) return reject(err);

        printer
          .font('a')
          .align('ct')
          .style('b')
          .size(2, 2)
          .text('SMARTMENU CAFE')
          .size(1, 1)
          .text('Receipt')
          .text('--------------------------------')
          .align('lt');
        
        if (order.tableNumber) {
          printer.text(`Table: ${order.tableNumber}`);
        }
        printer.text(`Order ID: ${order.id.slice(-4).toUpperCase()}`);
        printer.text(`Type: ${order.orderType}`);
        printer.text('--------------------------------');

        // Items
        order.items.forEach(item => {
          let line = `${item.qty}x ${item.name}`;
          // pad to 32 chars
          if (line.length > 24) line = line.substring(0, 24);
          const priceStr = `${item.totalPrice.toFixed(2)}`;
          const spaces = 32 - line.length - priceStr.length;
          printer.text(line + ' '.repeat(Math.max(1, spaces)) + priceStr);
        });

        printer.text('--------------------------------');
        printer.align('rt')
               .text(`Subtotal: ${order.totals.subtotal.toFixed(2)}`)
               .text(`Tax: ${order.totals.tax.toFixed(2)}`)
               .style('b')
               .size(2,2)
               .text(`TOTAL: ${order.totals.total.toFixed(2)}`)
               .size(1,1)
               .style('normal')
               .align('ct')
               .text('Thank you for your visit!')
               .text('--------------------------------')
               .cut()
               .close();
        
        resolve();
      });
    } catch (e) {
      reject(e);
    }
  });
};

app.post('/api/print', async (req, res) => {
  const { order, printerConfig } = req.body;
  if (!order) return res.status(400).json({ error: 'Order data required' });

  try {
    let device;
    if (printerConfig?.type === 'network') {
      device = new escpos.Network(printerConfig.ip, printerConfig.port || 9100);
    } else {
      // Default to USB
      device = new escpos.USB();
    }
    
    await printReceipt(order, device);
    res.json({ success: true });
  } catch (err) {
    console.error("Print Error:", err);
    // If printing fails (e.g., no printer connected), return error
    // so the client can fallback to digital receipt
    res.status(500).json({ error: err.message || 'Printer not found' });
  }
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Local Hub & Print Agent running on http://localhost:${PORT}`);
});
