import express, { Request, Response } from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 8001;

app.use(cors());
app.use(express.json());

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'customer' | 'vendor' | 'admin';
  businessName?: string;
  createdAt: string;
}

// In-Memory Database for Auth Microservice
const USERS: User[] = [
  { id: 'usr-customer-1', name: 'Felix Kumar', email: 'customer@magizhnaazh.com', phone: '+91 9840112233', role: 'customer', createdAt: new Date().toISOString() },
  { id: 'usr-vendor-1', name: 'Leela Management', email: 'vendor@magizhnaazh.com', phone: '+91 44 33661234', role: 'vendor', businessName: 'The Leela Palace Grand Ballroom', createdAt: new Date().toISOString() },
  { id: 'usr-admin-1', name: 'Super Admin', email: 'admin@magizhnaazh.com', phone: '+91 9999900000', role: 'admin', createdAt: new Date().toISOString() },
];

// 1. Customer / Vendor / Admin Register
app.post('/api/v1/auth/register', (req: Request, res: Response) => {
  const { name, email, phone, password, role, businessName } = req.body;
  if (!email || !name) {
    return res.status(400).json({ success: false, message: 'Name and Email are required.' });
  }

  const newUser: User = {
    id: `usr-${Date.now()}`,
    name,
    email,
    phone: phone || '',
    role: role || 'customer',
    businessName: businessName || '',
    createdAt: new Date().toISOString(),
  };

  USERS.push(newUser);

  return res.status(201).json({
    success: true,
    message: `${role || 'Customer'} account registered successfully.`,
    data: {
      user: newUser,
      token: `jwt-mock-token-${newUser.id}`,
    },
  });
});

// 2. Login Endpoint for all roles
app.post('/api/v1/auth/login', (req: Request, res: Response) => {
  const { email, password } = req.body;
  const user = USERS.find((u) => u.email.toLowerCase() === email?.toLowerCase());

  if (!user) {
    return res.status(401).json({ success: false, message: 'Invalid credentials or user not found.' });
  }

  return res.json({
    success: true,
    message: 'Authentication successful.',
    data: {
      user,
      token: `jwt-mock-token-${user.id}`,
    },
  });
});

// 3. User Profile Endpoint
app.get('/api/v1/auth/me', (req: Request, res: Response) => {
  const user = USERS[0];
  res.json({ success: true, data: { user } });
});

// 4. Admin Users List Management Endpoint
app.get('/api/v1/auth/admin/users', (req: Request, res: Response) => {
  res.json({ success: true, data: { users: USERS, total: USERS.length } });
});

app.listen(PORT, () => {
  console.log(`[Auth Microservice] Running on http://localhost:${PORT}`);
});
