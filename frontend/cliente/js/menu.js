// JavaScript for Menu page - Button interactivity

document.addEventListener('DOMContentLoaded', function() {
    const galeriaBtn = document.getElementById('galeriaBtn');
    
    if (galeriaBtn) {
        // Add click event listener
        galeriaBtn.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Add visual feedback - scale animation
            this.style.transform = 'scale(0.95)';
            
            // Redirect to Galeria page
            setTimeout(() => {
                this.textContent = "Banana...";
                setTimeout(() => {
                    window.location.href = 'galeria.html';
                }, 500);
            }, 150);
        });
        
        // Add hover effect enhancement via JS
        galeriaBtn.addEventListener('mouseenter', function() {
            this.style.animationPlayState = 'paused';
        });
        
        galeriaBtn.addEventListener('mouseleave', function() {
            this.style.animationPlayState = 'running';
        });
    }
});
