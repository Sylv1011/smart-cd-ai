import {StrategyTabIcon} from './Icons/index';

const strategyTabs = [
    { id: 'best-rate', title: 'Best Rate', subtitle: 'Highest single after-tax yield' },
    { id: 'ladder', title: 'CD Ladder', subtitle: 'Rolling liquidity every quarter' },
    { id: 'barbell', title: 'Barbell', subtitle: 'Short + long, skip the middle' },
    { id: 'bullet', title: 'Bullet', subtitle: 'All mature on your target date' },
  ];

const TAB_COLORS = {
  bullet: '#F59E0C',
  barbell: '#A855F7',
  ladder: '#F59E0C',
}


// Attach the color to each tab at definition time (or derive it below if
// strategyTabs is defined elsewhere and you can't touch it).
const strategyTabsWithColor = strategyTabs.map((tab) => ({
  ...tab,
  color: TAB_COLORS[tab.id] ?? '#F59E0C',  // Default color if not found
}));
 


const Main_Header = ({ strategyView, handleTabChange }) => {
    return (
        <>
            {strategyView === 'bullet' && (
                          <div className="mb-4">
                            <h1 className="text-[20px] font-bold leading-[28px] text-white">Bullet Strategy</h1>
                            <p className="text-[14px] leading-[20px] text-[#4A6A8A]">Compare all CDs with the best after-tax yields for your situation</p>
                          </div>
            )}
            {strategyView === 'barbell' && (
                          <div className="mb-4">
                            <h1 className="text-[20px] font-bold leading-[28px] text-white">Barbell Strategy</h1>
                            <p className="text-[14px] leading-[20px] text-[#4A6A8A]">Compare all CDs with the best after-tax yields for your situation</p>
                          </div>
            )} 
            <section className="mb-6 w-full min-h-[114px] rounded-[10px] border border-[#23446A] bg-[#0D1B2D] p-[20px] shadow-[inset_0_0_0_1px_rgba(35,68,106,0.35)] md:p-[30px]">
                          <div className="mx-auto flex w-full max-w-[1226px] flex-wrap items-center gap-x-[30px] gap-y-3 lg:flex-nowrap">
                            {strategyTabsWithColor.map((tab) => {
                              const active = strategyView === tab.id;
                              const c = tab.color;

                              return (
                                <button
                                  key={tab.id}
                                  type="button"
                                  onClick={() => handleTabChange(tab.id)}
                                  style={{
                                    borderRadius:  '12px',
                                    paddingLeft:   active ? '24px' : '0px',
                                    paddingRight:  active ? '24px' : '0px',
                                    borderWidth:   '1px',
                                    borderStyle:   'solid',
                                    borderColor:   active ? c         : 'transparent',
                                    background:    active ? '#0D1B2E' : 'transparent',
                                    boxShadow:     active
                                      ? `inset 0 0 0 1px ${c}47, 0 0 0 1px ${c}33`
                                      : 'inset 0 0 0 1px transparent, 0 0 0 1px transparent',
                                  }}
                                  className={`w-[273px] flex h-[67px] shrink-0 items-center gap-3 border-0 bg-transparent text-left transition-[border-color,background,box-shadow,padding] duration-300 ease-out ${
                                    active? '' : 'px-0 hover:opacity-90'
                                  }`}
                                >
                                  <span className="inline-flex h-5 w-5 items-center justify-center">
                                    <StrategyTabIcon id={tab.id} active={active} />
                                  </span>
                                  <span className="relative h-[42px] w-[204px]">
                                    <span className={`absolute left-0 top-0 text-[18px] font-semibold leading-[20px]` } style={{ color: active ? c : '#94A3B8' }}>{tab.title}</span>
                                    <span className={`absolute left-0 top-6 w-[200px] text-[14px] font-normal leading-[20px]` } style={{ color: active ? c : '#94A3B8' }}>{tab.subtitle}</span>
                                  </span>
                                </button>
                              );
                            })}
                          </div>
            </section>
        </>
    )
}

export default Main_Header;




