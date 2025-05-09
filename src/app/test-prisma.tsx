import { prisma } from '@/lib/prisma';

export default async function TestPrisma() {
  // Test database connection by fetching orders
  const orders = await prisma.order.findMany({
    take: 5,
  });

  return (
    <div className="p-10">
      <h1 className="text-2xl font-bold mb-4">Prisma Test</h1>
      
      <div className="bg-gray-100 p-4 rounded">
        <h2 className="text-xl mb-2">Found {orders.length} orders</h2>
        
        {orders.length > 0 ? (
          <div>
            <pre className="bg-black text-green-400 p-4 rounded overflow-auto">
              {JSON.stringify(orders.map(o => ({
                id: o.id,
                status: o.status,
                total: o.total.toString(),
                customerName: o.customerName,
              })), null, 2)}
            </pre>
          </div>
        ) : (
          <p>No orders found in database.</p>
        )}
      </div>
    </div>
  );
}
