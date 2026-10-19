const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');
const search = `                            <select 
                              value={posterSizes[poster.id] || SIZES[0]} 
                              onChange={(e) => setPosterSizes(prev => ({ ...prev, [poster.id]: e.target.value }))}
                              className="w-1/2 flex-1 border border-[#E5E5E5] text-[10px] uppercase p-2 pr-6 font-bold text-black focus:outline-none focus:border-black bg-white truncate h-[34px] appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width=%2212%22%20height=%2212%22%20xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cpath%20d=%22M3%204.5l3%203%203-3%22%20stroke=%22%23999%22%20stroke-width=%221.5%22%20fill=%22none%22%20stroke-linecap=%22round%22%20stroke-linejoin=%22round%22/%3E%3C/svg%3E')] bg-no-repeat bg-[right_8px_center]"
                            >
                              {SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <div className="w-1/2 flex-1 flex items-center border border-[#E5E5E5] h-[34px] relative bg-white">
                              <button 
                                className="w-8 h-full flex items-center justify-center text-[#999] hover:text-black hover:bg-[#F7F7F7] transition-colors absolute left-0 top-0 bottom-0 z-10"
                                onClick={() => setPosterQuantities(prev => ({ ...prev, [poster.id]: Math.max(1, (prev[poster.id] || 1) - 1) }))}
                              >
                                -
                              </button>
                              <input 
                                type="number" 
                                min="1" 
                                max="100" 
                                value={posterQuantities[poster.id] || 1}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value);
                                  if (!isNaN(val)) {
                                    setPosterQuantities(prev => ({ ...prev, [poster.id]: Math.min(100, Math.max(1, val)) }));
                                  }
                                }}
                                className="w-full h-full text-center text-[10px] uppercase font-bold text-black focus:outline-none focus:bg-[#F7F7F7] bg-transparent z-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              />
                              <button 
                                className="w-8 h-full flex items-center justify-center text-[#999] hover:text-black hover:bg-[#F7F7F7] transition-colors absolute right-0 top-0 bottom-0 z-10"
                                onClick={() => setPosterQuantities(prev => ({ ...prev, [poster.id]: Math.min(100, (prev[poster.id] || 1) + 1) }))}
                              >
                                +
                              </button>
                            </div>`;
const replace = `                            <select 
                              value={posterSizes[poster.id] || SIZES[0]} 
                              onChange={(e) => setPosterSizes(prev => ({ ...prev, [poster.id]: e.target.value }))}
                              className="w-[60%] flex-1 border border-[#E5E5E5] text-[10px] uppercase pl-2 pr-6 font-bold text-black focus:outline-none focus:border-black bg-white truncate h-[34px] appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width=%2212%22%20height=%2212%22%20xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cpath%20d=%22M3%204.5l3%203%203-3%22%20stroke=%22%23999%22%20stroke-width=%221.5%22%20fill=%22none%22%20stroke-linecap=%22round%22%20stroke-linejoin=%22round%22/%3E%3C/svg%3E')] bg-no-repeat bg-[right_8px_center]"
                            >
                              {SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <div className="w-[40%] flex items-center border border-[#E5E5E5] h-[34px] bg-white">
                              <button 
                                className="w-[28px] h-full flex items-center justify-center text-[#999] hover:text-black hover:bg-[#F7F7F7] transition-colors flex-shrink-0"
                                onClick={() => setPosterQuantities(prev => ({ ...prev, [poster.id]: Math.max(1, (prev[poster.id] || 1) - 1) }))}
                              >
                                -
                              </button>
                              <input 
                                type="number" 
                                min="1" 
                                max="100" 
                                value={posterQuantities[poster.id] || 1}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value);
                                  if (!isNaN(val)) {
                                    setPosterQuantities(prev => ({ ...prev, [poster.id]: Math.min(100, Math.max(1, val)) }));
                                  }
                                }}
                                className="w-full flex-1 min-w-[20px] h-full text-center text-[10px] uppercase font-bold text-black focus:outline-none focus:bg-[#F7F7F7] bg-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none px-0"
                              />
                              <button 
                                className="w-[28px] h-full flex items-center justify-center text-[#999] hover:text-black hover:bg-[#F7F7F7] transition-colors flex-shrink-0"
                                onClick={() => setPosterQuantities(prev => ({ ...prev, [poster.id]: Math.min(100, (prev[poster.id] || 1) + 1) }))}
                              >
                                +
                              </button>
                            </div>`;
code = code.split(search).join(replace);
fs.writeFileSync('src/App.tsx', code);
