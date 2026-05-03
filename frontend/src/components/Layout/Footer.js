import '../../css/layout/Footer.css';

export default function Footer(){
    return(
        // className="Footer"가 CSS의 .Footer와 일치하므로 스타일은 잘 적용됩니다.
        <footer className="Footer"> 
            <h3 id="footer-logo">👁 DeepEye</h3>
            <p>© 2026 DeepEye. Developed for Graduation Thesis</p>
            <p>Developed by Do-yeon Lim, Dept. of Biomedical Engineering, HUFS Global Campus.</p>
            <p style={{fontSize: '0.8rem', opacity: 0.7}}>
                Advisor: Prof. Mohsen Ali Mohsen Alawami & Prof. Kim Bo-hyung
            </p>
        </footer>
    );
}