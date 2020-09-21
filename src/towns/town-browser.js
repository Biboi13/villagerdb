import React from "react";
import ReactDOM from "react-dom"
import $ from 'jquery'

import Paginator from '../search/paginator.js';
import Loader from '../search/loader.js';

/**
 *
 */
class TownBrowser extends React.Component {
    /**
     *
     * @param props
     */
    constructor(props) {
        super(props);

        // Loading until we mount and can make a request.
        this.state = {
            isLoading: true,
        };

        // Bindings
        this.setPage = this.setPage.bind(this);
    }

    componentDidMount() {
        // Listen for pop state event.
        window.addEventListener('popstate', (event) => {
            if (event.state) {
                this.setState(event.state);
            } else {
                this.getResults(this.props.pageNumber, false);
            }
        });

        this.getResults(this.props.pageNumber, false);
    }

    /**
     *
     * @returns {*}
     */
    render() {
        // Error case.
        if (this.state.error) {
            return (
                <p className="p-3 mb-2 bg-danger text-white">
                    We're having some trouble. Try refreshing the page.
                </p>
            );
        }

        // Show loader?
        let loader = null;
        if (this.state.isLoading) {
            loader = (
                <Loader/>
            );
        }

        // Now, render!
        return (
            <div id={this.props.id}>
                {loader}
                <Paginator onPageChange={this.setPage}
                           currentPage={this.state.currentPage}
                           startIndex={this.state.startIndex}
                           endIndex={this.state.endIndex}
                           totalCount={this.state.totalCount}
                           totalPages={this.state.totalPages}
                           topAnchor={'#' + this.props.id} />
                <Paginator onPageChange={this.setPage}
                           currentPage={this.state.currentPage}
                           startIndex={this.state.startIndex}
                           endIndex={this.state.endIndex}
                           totalCount={this.state.totalCount}
                           totalPages={this.state.totalPages}
                           topAnchor={'#' + this.props.id} />
            </div>
        );
    }

    getResults(pageNumber, pushState) {
        const updateState = (pushState, response) => {
            const newState = {
                currentPage: response.currentPage,
                startIndex: response.startIndex,
                endIndex: response.endIndex,
                totalCount: response.totalCount,
                totalPages: response.totalPages,
                results: response.results,
                isLoading: false
            };
            let url = this.getPageUrl(response.currentPage);
            if (pushState) {
                history.pushState(newState, null, url);
            }
            this.setState(newState);
        };

        // Make AJAX request to get the page.
        let url = this.getAjaxUrl(pageNumber);

        this.setState({
            isLoading: true
        });
        $.ajax({
            url: url,
            type: 'GET',
            dataType: 'json',
            success: updateState.bind(this, pushState),
            error: this.onError.bind(this)
        });
    }

    setPage(pageNumber) {
        this.getResults(pageNumber, true);
    }

    onError() {
        this.setState({
            isLoading: false,
            error: true
        });
    }

    getAjaxUrl(pageNumber) {
        let url = this.props.ajaxUrlPrefix + pageNumber;
        if (this.props.searchQuery) {
            url += '?q=' + encodeURIComponent(this.props.searchQuery);
        }
        return url;
    }

    getPageUrl(pageNumber) {
        let url = this.props.pageUrlPrefix + pageNumber;
        if (this.props.searchQuery) {
            url += '?q=' + encodeURIComponent(this.props.searchQuery);
        }
        return url;
    }
}

/**
 * When DOM ready, initialize the browser.
 */
$(document).ready(function() {
    const targetElement = $('#towns-browser');
    if (targetElement.length !== 1) {
        return;
    }

    const ajaxUrlPrefix = targetElement.attr('data-ajax-url-prefix');
    const pageUrlPrefix = targetElement.attr('data-page-url-prefix');
    const pageNumber = targetElement.attr('data-page-number');
    const searchQuery = targetElement.attr('data-search-query');
    ReactDOM.render(<TownBrowser id="towns-browser-react"
        ajaxUrlPrefix={ajaxUrlPrefix}
        pageUrlPrefix={pageUrlPrefix}
        pageNumber={pageNumber}
        searchQuery={searchQuery} />, targetElement[0]);
})
