import React from 'react';

const LoginPage = () => {
  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      {/* TSU Header */}
      <div className="w-full bg-blue-800 py-4">
        <div className="container mx-auto flex justify-center">
          <div className="text-white text-center">
            <h1 className="text-4xl font-serif">TENNESSEE</h1>
            <h2 className="text-3xl font-serif">STATE UNIVERSITY</h2>
          </div>
        </div>
      </div>
      
      {/* Main content */}
      <div className="flex-grow flex items-center justify-center py-12">
        <div className="w-full max-w-2xl p-12 bg-white rounded-lg shadow-md">
          <div className="flex flex-row">
            {/* Left side - like Google's layout */}
            <div className="w-1/2 pr-8">
              <div className="mb-4">
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center mb-6">
                  <span className="text-white text-xl font-bold">V</span>
                </div>
                <h1 className="text-2xl font-normal mb-1">Type in</h1>
                <p className="text-sm text-gray-600">Create a virtual id</p>
              </div>
            </div>
            
            {/* Right side - form fields */}
            <div className="w-1/2">
              <form className="flex flex-col">
                <div className="mb-4">
                  <input
                    type="email"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter your email"
                  />
                </div>
                
                <div className="mb-6">
                  <input
                    type="text"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter your campus ID"
                  />
                </div>
                
                <div className="flex justify-center">
                  <button
                    type="submit"
                    className="px-8 py-2 bg-gray-200 rounded-md text-gray-800 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400"
                  >
                    Submit
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;