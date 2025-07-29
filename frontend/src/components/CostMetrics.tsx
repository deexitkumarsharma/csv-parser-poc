import { useQuery } from '@tanstack/react-query'
import { DollarSign, Zap, Clock, Database, TrendingUp } from 'lucide-react'
import { parserApi } from '@/services/api'
import { useParserStore } from '@/stores/parserStore'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'

export function CostMetrics() {
  const { currentJob } = useParserStore()

  const { data: metrics } = useQuery({
    queryKey: ['metrics', currentJob?.job_id],
    queryFn: () => parserApi.getMetrics(currentJob!.job_id),
    enabled: !!currentJob,
    refetchInterval: 5000, // Refresh every 5 seconds
  })

  // Mock data for charts
  const costBreakdown = [
    { name: 'LLM API Calls', value: 0.08, color: '#3B82F6' },
    { name: 'Processing', value: 0.01, color: '#10B981' },
    { name: 'Storage', value: 0.01, color: '#F59E0B' },
  ]

  const performanceData = [
    { stage: 'Upload', time: 2 },
    { stage: 'Parsing', time: 5 },
    { stage: 'Mapping', time: 3 },
    { stage: 'Validation', time: 4 },
    { stage: 'Cleaning', time: 3 },
  ]

  const tokenUsage = [
    { time: '10:00', tokens: 500 },
    { time: '10:01', tokens: 1200 },
    { time: '10:02', tokens: 800 },
    { time: '10:03', tokens: 1500 },
    { time: '10:04', tokens: 1000 },
  ]

  if (!metrics) {
    return (
      <div className="max-w-6xl mx-auto text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="mt-4 text-gray-500">Loading metrics...</p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Cost & Performance Metrics</h2>
        <p className="text-gray-600 mt-1">
          Track AI usage, costs, and processing performance
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="w-8 h-8 text-green-500" />
            <span className="text-xs text-gray-500">Total Cost</span>
          </div>
          <p className="text-2xl font-bold">${metrics.estimated_cost.toFixed(2)}</p>
          <p className="text-xs text-green-600 mt-1">
            {metrics.estimated_cost < 0.10 ? '✓ Under budget' : '⚠️ Over budget'}
          </p>
        </div>

        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center justify-between mb-2">
            <Zap className="w-8 h-8 text-blue-500" />
            <span className="text-xs text-gray-500">LLM Calls</span>
          </div>
          <p className="text-2xl font-bold">{metrics.llm_calls}</p>
          <p className="text-xs text-gray-600 mt-1">
            {metrics.llm_tokens_used.toLocaleString()} tokens
          </p>
        </div>

        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center justify-between mb-2">
            <Clock className="w-8 h-8 text-purple-500" />
            <span className="text-xs text-gray-500">Processing Time</span>
          </div>
          <p className="text-2xl font-bold">
            {metrics.processing_time_seconds.toFixed(1)}s
          </p>
          <p className="text-xs text-gray-600 mt-1">
            {(currentJob?.row_count! / metrics.processing_time_seconds).toFixed(0)} rows/sec
          </p>
        </div>

        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center justify-between mb-2">
            <Database className="w-8 h-8 text-orange-500" />
            <span className="text-xs text-gray-500">Cache Efficiency</span>
          </div>
          <p className="text-2xl font-bold">
            {((metrics.cache_hits / (metrics.cache_hits + metrics.cache_misses)) * 100).toFixed(0)}%
          </p>
          <p className="text-xs text-gray-600 mt-1">
            {metrics.cache_hits} hits / {metrics.cache_misses} misses
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        {/* Cost Breakdown */}
        <div className="bg-white p-6 rounded-lg border">
          <h3 className="text-lg font-semibold mb-4">Cost Breakdown</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={costBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {costBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => `$${value.toFixed(2)}`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2">
            {costBreakdown.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span>{item.name}</span>
                </div>
                <span className="font-medium">${item.value.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Performance Timeline */}
        <div className="bg-white p-6 rounded-lg border">
          <h3 className="text-lg font-semibold mb-4">Processing Timeline</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="stage" />
                <YAxis />
                <Tooltip formatter={(value: any) => `${value}s`} />
                <Bar dataKey="time" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Token Usage Over Time */}
      <div className="bg-white p-6 rounded-lg border mb-8">
        <h3 className="text-lg font-semibold mb-4">Token Usage Over Time</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={tokenUsage}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="tokens"
                stroke="#3B82F6"
                strokeWidth={2}
                dot={{ fill: '#3B82F6' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Optimization Suggestions */}
      <div className="bg-blue-50 p-6 rounded-lg">
        <div className="flex items-start space-x-3">
          <TrendingUp className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
          <div>
            <h3 className="text-lg font-semibold text-blue-900">
              Optimization Opportunities
            </h3>
            <ul className="mt-3 space-y-2 text-sm text-blue-800">
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>
                  Enable batch processing for files larger than 10MB to reduce API calls by 40%
                </span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>
                  Your cache hit rate is {((metrics.cache_hits / (metrics.cache_hits + metrics.cache_misses)) * 100).toFixed(0)}%.
                  Processing similar files will be faster and cheaper.
                </span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>
                  Consider using pattern matching for common column names to reduce LLM usage
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}