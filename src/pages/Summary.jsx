
import { Link } from 'react-router-dom';

function Summary() {
  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8 flex justify-center items-start pt-12">
      <div className="max-w-2xl w-full bg-white rounded-lg shadow-sm overflow-hidden">

        {/* Email Header Mock */}
        <div className="bg-gray-100 border-b p-4 flex justify-between items-center text-sm">
          <div>
            <span className="text-gray-500 font-semibold">From: </span>
            <span>FieldReq Agent &lt;hello@fieldreq.app&gt;</span>
          </div>
          <div className="text-gray-500">
            Friday, 3:00 PM
          </div>
        </div>

        {/* Email Content Mock */}
        <div className="p-8">
          <h1 className="text-2xl font-bold mb-6 text-gray-900">Friday Material Summary</h1>
          <p className="mb-6 text-gray-700">Here are the material requests from your crew for next week:</p>

          <div className="space-y-6">

            {/* Project 1 */}
            <div>
              <h2 className="text-lg font-bold border-b border-gray-200 pb-2 mb-3 text-blue-800">
                Pearson High School
              </h2>
              <ul className="space-y-2">
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span>2&quot; PVC pipe (20 sticks) <span className="text-gray-500 text-sm ml-1">- requested by Mike</span></span>
                </li>
                <li className="flex items-start">
                  <span className="text-yellow-500 mr-2">⊙</span>
                  <span>PVC Glue (Clear) <span className="text-gray-500 text-sm ml-1">- requested by Mike</span></span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span>3&quot; Cast iron fittings <span className="text-gray-500 text-sm ml-1">- requested by Jose (translated from Spanish)</span></span>
                </li>
              </ul>
            </div>

            {/* Project 2 */}
            <div>
              <h2 className="text-lg font-bold border-b border-gray-200 pb-2 mb-3 text-blue-800">
                Pioneer Ridge Dev
              </h2>
              <ul className="space-y-2">
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span>Copper tubing 1/2&quot; <span className="text-gray-500 text-sm ml-1">- requested by Alex</span></span>
                </li>
                <li className="text-gray-500 italic text-sm mt-2">
                  No other requests for this project.
                </li>
              </ul>
            </div>

          </div>

          <div className="mt-12 pt-6 border-t border-gray-200 text-sm text-gray-500 text-center">
            <p>Sent by your FieldReq Agent. <Link to="/demo" className="text-blue-500 hover:underline">View Dashboard</Link></p>
          </div>
        </div>
      </div>

      <div className="absolute top-4 left-4">
        <Link to="/demo" className="text-blue-600 hover:underline bg-white px-3 py-1 rounded shadow-sm text-sm">
          &larr; Back to Demo
        </Link>
      </div>
    </div>
  );
}

export default Summary;
