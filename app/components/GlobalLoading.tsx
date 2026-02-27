'use client'

import React from 'react'
import styles from './loading.module.css' // We will put the CSS here

export default function GlobalLoading({ message = "Building Your Experience" }) {
  return (
    <div className={styles.customLoadingScreen}>
      <div className={styles.loadingContent}>
        <div className={styles.constructionScene}>
          <div className={styles.crane}>
            <div className={styles.craneArm}></div>
            <div className={styles.craneCable}></div>
            <div className={styles.craneHook}></div>
          </div>
          <div className={styles.buildingBlocks}>
            <div className={`${styles.block} ${styles.block1}`}></div>
            <div className={`${styles.block} ${styles.block2}`}></div>
            <div className={`${styles.block} ${styles.block3}`}></div>
          </div>
          <div className={styles.blueprintGrid}>
            <div className={styles.gridLine}></div>
            <div className={styles.gridLine}></div>
            <div className={styles.gridLine}></div>
          </div>
        </div>
        <div className={styles.loadingTextContainer}>
          <h2 className={styles.loadingTitle}>{message}</h2>
          <div className={styles.progressDots}>
            <span className={styles.dot}></span>
            <span className={styles.dot}></span>
            <span className={styles.dot}></span>
          </div>
        </div>
      </div>
    </div>
  )
}