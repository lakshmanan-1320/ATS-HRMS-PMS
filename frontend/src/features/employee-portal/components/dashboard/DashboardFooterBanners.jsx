import React from 'react'
import { FiPlus, FiHeadphones, FiArrowRight } from 'react-icons/fi'
import { PMS } from '../../theme'

export function KeepGoingBanner({ onNewGoal, className }) {
  return (
    <section className={className} style={{
      position: 'relative', overflow: 'hidden', background: PMS.navy, borderRadius: PMS.radiusPanel,
      minHeight: '146px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px',
      padding: '20px 25px 20px 0', boxSizing: 'border-box', flexWrap: 'wrap', minWidth: 0,
    }}>
      <img
        src="/pms/keep-going-mountain.svg"
        alt=""
        aria-hidden
        className="pms-hide-sm"
        width="258"
        height="146"
        style={{ position: 'absolute', left: '26px', bottom: 0, width: '258px', height: '146px', pointerEvents: 'none' }}
      />
      <div className="pms-banner-text" style={{ position: 'relative', minWidth: 0, flex: '1 1 260px' }}>
        <div style={{ fontFamily: PMS.fontHead, fontSize: '16px', fontWeight: 700, color: PMS.white, lineHeight: '24px' }}>
          Keep going, great things take time.
        </div>
        <div style={{ fontFamily: PMS.fontHead, fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>
          Stay consistent and make every day count.
        </div>
      </div>
      {onNewGoal && (
        <button
          type="button"
          onClick={onNewGoal}
          className="pms-hover-lift pms-focus"
          style={{
            position: 'relative', height: '44px', padding: '0 18px', borderRadius: '22px', border: 'none',
            background: PMS.white, color: PMS.blue, display: 'inline-flex', alignItems: 'center', gap: '8px',
            fontFamily: PMS.fontHead, fontSize: '13px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
          }}
        >
          <FiPlus size={14} strokeWidth={2.6} /> Set a new goal
        </button>
      )}
    </section>
  )
}

export function NeedHelpCard({ onContact }) {
  return (
    <section className="pms-help-card" style={{
      background: PMS.navy, borderRadius: PMS.radiusInner, minHeight: '146px', padding: '21px 21px 22px',
      boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '18px', minWidth: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
        <span style={{ width: '40px', height: '40px', borderRadius: '50%', background: PMS.steel, color: PMS.white, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <FiHeadphones size={16} />
        </span>
        <span style={{ minWidth: 0 }}>
          <span style={{ display: 'block', fontFamily: PMS.fontHead, fontSize: '13px', fontWeight: 700, color: PMS.white }}>Need Help?</span>
          <span style={{ display: 'block', fontFamily: PMS.fontHead, fontSize: '10px', color: 'rgba(255,255,255,0.65)' }}>Our support team is here for you.</span>
        </span>
      </div>
      <button
        type="button"
        onClick={onContact}
        className="pms-hover-lift pms-focus"
        style={{
          height: '40px', width: '100%', borderRadius: '12px', border: 'none', background: PMS.white, color: PMS.steel,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          fontFamily: PMS.fontHead, fontSize: '12px', fontWeight: 700, cursor: 'pointer',
        }}
      >
        Contact Support <FiArrowRight size={13} />
      </button>
    </section>
  )
}
