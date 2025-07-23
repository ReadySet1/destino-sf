'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';

interface ArchivedOrdersFiltersProps {
  currentSearch: string;
  currentType: string;
  currentReason: string;
  currentArchivedBy: string;
  currentStartDate: string;
  currentEndDate: string;
}

export default function ArchivedOrdersFilters({
  currentSearch,
  currentType,
  currentReason,
  currentArchivedBy,
  currentStartDate,
  currentEndDate,
}: ArchivedOrdersFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(currentSearch);
  const [type, setType] = useState(currentType);
  const [reason, setReason] = useState(currentReason);
  const [archivedBy, setArchivedBy] = useState(currentArchivedBy);
  const [startDate, setStartDate] = useState(currentStartDate);
  const [endDate, setEndDate] = useState(currentEndDate);

  // Update local state when props change
  useEffect(() => {
    setSearch(currentSearch);
    setType(currentType);
    setReason(currentReason);
    setArchivedBy(currentArchivedBy);
    setStartDate(currentStartDate);
    setEndDate(currentEndDate);
  }, [
    currentSearch,
    currentType,
    currentReason,
    currentArchivedBy,
    currentStartDate,
    currentEndDate,
  ]);

  const updateFilters = () => {
    const params = new URLSearchParams(searchParams);

    // Update or remove search parameter
    if (search.trim()) {
      params.set('search', search.trim());
    } else {
      params.delete('search');
    }

    // Update or remove type parameter
    if (type && type !== 'all') {
      params.set('type', type);
    } else {
      params.delete('type');
    }

    // Update or remove reason parameter
    if (reason.trim()) {
      params.set('reason', reason.trim());
    } else {
      params.delete('reason');
    }

    // Update or remove archivedBy parameter
    if (archivedBy.trim()) {
      params.set('archivedBy', archivedBy.trim());
    } else {
      params.delete('archivedBy');
    }

    // Update or remove date parameters
    if (startDate) {
      params.set('startDate', startDate);
    } else {
      params.delete('startDate');
    }

    if (endDate) {
      params.set('endDate', endDate);
    } else {
      params.delete('endDate');
    }

    // Reset to page 1 when filters change
    params.delete('page');

    router.push(`/admin/orders/archived?${params.toString()}`);
  };

  const clearFilters = () => {
    setSearch('');
    setType('all');
    setReason('');
    setArchivedBy('');
    setStartDate('');
    setEndDate('');
    router.push('/admin/orders/archived');
  };

  const hasActiveFilters = search || type !== 'all' || reason || archivedBy || startDate || endDate;

  return (
    <div className="bg-white p-4 rounded-lg shadow-md mb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Search */}
        <div>
          <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
            Search
          </label>
          <input
            type="text"
            id="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Order ID, customer, email..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Type Filter */}
        <div>
          <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
            Order Type
          </label>
          <select
            id="type"
            value={type}
            onChange={e => setType(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Types</option>
            <option value="regular">Regular Orders</option>
            <option value="catering">Catering Orders</option>
          </select>
        </div>

        {/* Reason Filter */}
        <div>
          <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-1">
            Archive Reason
          </label>
          <input
            type="text"
            id="reason"
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Search by reason..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Archived By Filter */}
        <div>
          <label htmlFor="archivedBy" className="block text-sm font-medium text-gray-700 mb-1">
            Archived By
          </label>
          <input
            type="text"
            id="archivedBy"
            value={archivedBy}
            onChange={e => setArchivedBy(e.target.value)}
            placeholder="Admin email or name..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Start Date */}
        <div>
          <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
            From Date
          </label>
          <input
            type="date"
            id="startDate"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* End Date */}
        <div>
          <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
            To Date
          </label>
          <input
            type="date"
            id="endDate"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 mt-4 pt-4 border-t border-gray-200">
        <button
          onClick={updateFilters}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Apply Filters
        </button>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="flex flex-wrap gap-2">
            <span className="text-sm font-medium text-gray-700">Active Filters:</span>
            {search && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Search: {search}
              </span>
            )}
            {type !== 'all' && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Type: {type}
              </span>
            )}
            {reason && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                Reason: {reason}
              </span>
            )}
            {archivedBy && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                By: {archivedBy}
              </span>
            )}
            {(startDate || endDate) && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                Date: {startDate || 'Any'} - {endDate || 'Any'}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
