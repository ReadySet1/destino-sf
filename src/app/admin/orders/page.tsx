import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { formatDistance } from "date-fns";
import { Decimal } from "@prisma/client/runtime/library";

type OrderWithItems = {
  id: string;
  status: string;
  total: Decimal | number | string; // Updated to include Decimal type
  customerName: string;
  pickupTime: Date | string;
  createdAt: Date | string;
  items: Array<{
    id: string;
    product: {
      id: string;
      name: string;
      [key: string]: string | number | boolean | null | undefined;
    };
    variant: {
      id: string;
      name: string;
      [key: string]: string | number | boolean | null | undefined;
    };
    [key: string]: string | number | boolean | null | undefined | object;
  }>;
};

// Define the shape of the resolved params
type ResolvedParams = {
  [key: string]: string | string[] | undefined;
};

export default async function OrdersPage({ 
  params 
}: { 
  params: Promise<ResolvedParams>
}) {
  await params; // We're not using the params, but we need to await the promise
  
  // Fetch the most recent orders
  const ordersFromDb = await prisma.order.findMany({
    take: 10,
    orderBy: {
      createdAt: "desc",
    },
    include: {
      items: {
        include: {
          product: true,
          variant: true,
        },
      },
    },
  });
  
  // Transform the orders to match our expected type
  const orders = ordersFromDb.map((order) => ({
    id: order.id,
    status: order.status,
    total: order.total,
    customerName: order.customerName,
    pickupTime: order.pickupTime,
    createdAt: order.createdAt,
    items: order.items.map((item) => ({
      id: item.id,
      product: {
        id: item.product.id,
        name: item.product.name,
      },
      variant: item.variant ? {
        id: item.variant.id,
        name: item.variant.name,
      } : {
        id: '',
        name: '',
      },
    })),
  })) as OrderWithItems[];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Order Management</h1>
        <div className="flex gap-2">
          <select className="border rounded p-2">
            <option value="all">All Orders</option>
            <option value="PENDING">Pending</option>
            <option value="PROCESSING">Processing</option>
            <option value="READY">Ready</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
          <input
            type="text"
            placeholder="Search orders..."
            className="border rounded p-2"
          />
        </div>
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Order ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Customer
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Items
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Pickup Time
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {orders.map((order) => (
              <tr key={order.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {order.id.substring(0, 8)}...
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {order.customerName}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(order.status)}`}>
                    {order.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {order.items.length}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  ${Number(order.total).toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(order.pickupTime).toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDistance(new Date(order.createdAt), new Date(), { addSuffix: true })}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <Link 
                    href={`/admin/orders/${order.id}`}
                    className="text-indigo-600 hover:text-indigo-900 mr-2"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function getStatusColor(status: string) {
  switch (status) {
    case "PENDING":
      return "bg-yellow-100 text-yellow-800";
    case "PROCESSING":
      return "bg-blue-100 text-blue-800";
    case "READY":
      return "bg-green-100 text-green-800";
    case "COMPLETED":
      return "bg-gray-100 text-gray-800";
    case "CANCELLED":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
} 